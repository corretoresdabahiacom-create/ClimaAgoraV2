// GET /api/check-and-notify-alerts?secret=XXXX
//
// Roda periodicamente (disparado por um GitHub Action agendado, não
// pelo usuário) e:
// 1. Lista usuários com pelo menos um token de notificação salvo
// 2. Para cada cidade favorita deles, busca alertas REAIS do INMET
// 3. Compara com os alertas já notificados antes (seenAlertIds)
// 4. Envia notificação push de verdade (FCM) só para os alertas
//    genuinamente NOVOS — nunca reenvia o mesmo alerta duas vezes
//
// Protegida por um segredo (CRON_SECRET) para que só o agendador
// autorizado consiga disparar essa verificação, não qualquer visitante.

import { getGoogleAccessToken, getProjectId } from "../_shared/googleAuth";
import { listUsersWithPushTokens, updateSeenAlertIds } from "../_shared/firestoreRest";
import { fetchInmetAlertsForCoords } from "../_shared/inmetAlerts";

interface Env {
  FIREBASE_SERVICE_ACCOUNT_JSON: string;
  CRON_SECRET: string;
}

async function sendFcmNotification(
  accessToken: string,
  projectId: string,
  token: string,
  title: string,
  body: string,
): Promise<boolean> {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          webpush: { fcm_options: { link: "/" } },
        },
      }),
    },
  );
  return res.ok;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const secret = url.searchParams.get("secret");

  if (!context.env.CRON_SECRET || secret !== context.env.CRON_SECRET) {
    return new Response(JSON.stringify({ error: "Não autorizado." }), { status: 401 });
  }

  if (!context.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return new Response(
      JSON.stringify({ error: "FIREBASE_SERVICE_ACCOUNT_JSON não configurada." }),
      { status: 500 },
    );
  }

  const projectId = getProjectId(context.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const accessToken = await getGoogleAccessToken(context.env.FIREBASE_SERVICE_ACCOUNT_JSON, [
    "https://www.googleapis.com/auth/datastore",
    "https://www.googleapis.com/auth/firebase.messaging",
  ]);

  const users = await listUsersWithPushTokens(accessToken, projectId);

  let notificationsSent = 0;
  let usersChecked = 0;

  for (const user of users) {
    if (!user.favoriteCities || user.favoriteCities.length === 0) continue;
    usersChecked++;

    const seen = new Set(user.seenAlertIds || []);
    const newSeen = new Set(seen);
    let hasNew = false;

    for (const city of user.favoriteCities) {
      const alerts = await fetchInmetAlertsForCoords(city.lat, city.lon);
      for (const alert of alerts) {
        const alertKey = `${city.id}:${alert.id}`;
        if (seen.has(alertKey)) continue;

        hasNew = true;
        newSeen.add(alertKey);

        const title = `Alerta do INMET: ${alert.event}`;
        const body = `${city.name}, ${city.state} — ${alert.description.slice(0, 120)}`;

        for (const token of user.fcmTokens) {
          const ok = await sendFcmNotification(accessToken, projectId, token, title, body);
          if (ok) notificationsSent++;
        }
      }
    }

    if (hasNew) {
      await updateSeenAlertIds(accessToken, projectId, user.uid, Array.from(newSeen));
    }
  }

  return new Response(
    JSON.stringify({ ok: true, usersChecked, notificationsSent }),
    { headers: { "Content-Type": "application/json" } },
  );
};
