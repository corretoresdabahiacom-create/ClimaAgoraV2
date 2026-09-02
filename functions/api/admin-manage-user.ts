// POST /api/admin-manage-user
// Body: { idToken: string, targetUid: string, action: "delete" }
//
// Exclui PERMANENTEMENTE a conta de autenticação de um usuário (ele não
// consegue mais fazer login, nem com o mesmo e-mail depois) e o
// documento correspondente no Firestore.
//
// Isso exige acesso de servidor (Firebase Admin) porque o SDK do
// cliente só permite que uma pessoa exclua a PRÓPRIA conta, nunca a de
// outra — reaproveitamos a mesma Service Account já configurada para o
// envio de notificações push.
//
// Segurança: o chamador nunca é confiado apenas por dizer "sou admin" —
// verificamos o idToken dele de verdade junto ao Google, e só então
// conferimos no Firestore (com a autoridade do servidor, não do
// cliente) se esse usuário verificado realmente tem role "admin".

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

async function getUserRole(accessToken: string, projectId: string, uid: string): Promise<string | null> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) return null;
    const data: any = await res.json();
    return data?.fields?.role?.stringValue ?? null;
  } catch {
    return null;
  }
}

async function setAuthDisabled(
  accessToken: string,
  projectId: string,
  uid: string,
  disabled: boolean,
): Promise<boolean> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ localId: uid, disableUser: disabled }),
    },
  );
  return res.ok;
}

async function updateBlockedFlag(
  accessToken: string,
  projectId: string,
  uid: string,
  blocked: boolean,
): Promise<void> {
  const url =
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}` +
    `?updateMask.fieldPaths=blocked`;
  await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { blocked: { booleanValue: blocked } } }),
  });
}

async function deleteAuthAccount(accessToken: string, projectId: string, uid: string): Promise<boolean> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:delete`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ localId: uid }),
    },
  );
  return res.ok;
}

async function deleteFirestoreDoc(accessToken: string, projectId: string, uid: string): Promise<boolean> {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return res.ok;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!context.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return new Response(JSON.stringify({ error: "Configuração do servidor incompleta." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: any;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Corpo da requisição inválido." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { idToken, targetUid, action } = body || {};
  if (!idToken || !targetUid || !["delete", "block", "unblock"].includes(action)) {
    return new Response(
      JSON.stringify({ error: "idToken, targetUid e action (delete/block/unblock) são obrigatórios." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const projectId = getProjectId(context.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const accessToken = await getGoogleAccessToken(context.env.FIREBASE_SERVICE_ACCOUNT_JSON, [
    "https://www.googleapis.com/auth/identitytoolkit",
    "https://www.googleapis.com/auth/datastore",
  ]);

  // 1. Verifica de verdade quem está chamando — nunca confiamos numa
  // afirmação do cliente, só no que o próprio Google confirma sobre o
  // token apresentado.
  const callerUid = await verifyIdTokenAndGetUid(accessToken, idToken);
  if (!callerUid) {
    return new Response(JSON.stringify({ error: "Sessão inválida ou expirada." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Confirma, com a autoridade do servidor (não do cliente), que
  // esse usuário verificado é mesmo admin.
  const callerRole = await getUserRole(accessToken, projectId, callerUid);
  if (callerRole !== "admin") {
    return new Response(JSON.stringify({ error: "Apenas administradores podem excluir usuários." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3. Proteção extra óbvia: um admin não pode se autoexcluir/autobloquear
  // por aqui (evita acidente que tira o próprio acesso ao painel).
  if (targetUid === callerUid) {
    return new Response(JSON.stringify({ error: "Você não pode executar esta ação na sua própria conta." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (action === "delete") {
    const authDeleted = await deleteAuthAccount(accessToken, projectId, targetUid);
    const docDeleted = await deleteFirestoreDoc(accessToken, projectId, targetUid);
    return new Response(
      JSON.stringify({ ok: authDeleted && docDeleted, authDeleted, docDeleted }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  // block / unblock — desativa/reativa a conta de autenticação em si
  // (nível Firebase, mais forte que a suspensão via campo do Firestore):
  // a pessoa não consegue nem se autenticar, muito antes de o app chegar
  // a checar qualquer campo.
  const ok = await setAuthDisabled(accessToken, projectId, targetUid, action === "block");
  if (ok) await updateBlockedFlag(accessToken, projectId, targetUid, action === "block");
  return new Response(JSON.stringify({ ok }), { headers: { "Content-Type": "application/json" } });
};
