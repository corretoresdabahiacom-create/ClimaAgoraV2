// POST /api/admin-send-notification
// Body: { idToken: string, targetUids: string[], title: string, body: string }
//
// Envio manual e imediato de notificação push para usuários específicos
// selecionados pelo admin — diferente de check-and-notify-alerts.ts (que
// roda sozinho a cada 20min só para alertas reais do INMET), esta rota é
// disparada sob demanda, para qualquer mensagem que o admin queira mandar.

import { getGoogleAccessToken, getProjectId } from "../_shared/googleAuth";

interface Env {
  FIREBASE_SERVICE_ACCOUNT_JSON: string;
}

async function verifyIdTokenAndGetUid(accessToken: string, idToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    return data?.users?.[0]?.localId ?? null;
  } catch {
    return null;
  }
}

async function getUserRoleAndTokens(
  accessToken: string,
  projectId: string,
  uid: string,
): Promise<{ role: string | null; tokens: string[] }> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) return { role: null, tokens: [] };
    const data: any = await res.json();
    const role = data?.fields?.role?.stringValue ?? null;
    const tokenValues = data?.fields?.fcmTokens?.arrayValue?.values ?? [];
    const tokens = tokenValues.map((v: any) => v.stringValue).filter(Boolean);
    return { role, tokens };
  } catch {
    return { role: null, tokens: [] };
  }
}

async function sendFcmNotification(
  accessToken: string,
  projectId: string,
  token: string,
  title: string,
  body: string,
): Promise<boolean> {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: { token, notification: { title, body }, webpush: { fcm_options: { link: "/" } } },
    }),
  });
  return res.ok;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!context.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return new Response(JSON.stringify({ error: "Configuração do servidor incompleta." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let requestBody: any;
  try {
    requestBody = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Corpo da requisição inválido." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { idToken, targetUids, title, body } = requestBody || {};
  if (!idToken || !Array.isArray(targetUids) || targetUids.length === 0 || !title || !body) {
    return new Response(
      JSON.stringify({ error: "idToken, targetUids, title e body são obrigatórios." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const projectId = getProjectId(context.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const accessToken = await getGoogleAccessToken(context.env.FIREBASE_SERVICE_ACCOUNT_JSON, [
    "https://www.googleapis.com/auth/identitytoolkit",
    "https://www.googleapis.com/auth/datastore",
    "https://www.googleapis.com/auth/firebase.messaging",
  ]);

  const callerUid = await verifyIdTokenAndGetUid(accessToken, idToken);
  if (!callerUid) {
    return new Response(JSON.stringify({ error: "Sessão inválida ou expirada." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const caller = await getUserRoleAndTokens(accessToken, projectId, callerUid);
  if (caller.role !== "admin") {
    return new Response(JSON.stringify({ error: "Apenas administradores podem enviar notificações." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  let usersWithoutToken = 0;
  for (const uid of targetUids) {
    const { tokens } = await getUserRoleAndTokens(accessToken, projectId, uid);
    if (tokens.length === 0) {
      usersWithoutToken++;
      continue;
    }
    for (const token of tokens) {
      const ok = await sendFcmNotification(accessToken, projectId, token, title, body);
      if (ok) sent++;
    }
  }

  return new Response(
    JSON.stringify({ ok: true, sent, usersWithoutToken, totalTargeted: targetUids.length }),
    { headers: { "Content-Type": "application/json" } },
  );
};
