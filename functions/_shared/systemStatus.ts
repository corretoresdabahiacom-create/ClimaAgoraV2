// Monitoramento real de disponibilidade das fontes de dado — grava o
// status em Firestore e notifica todo admin cadastrado quando uma fonte
// MUDA de "no ar" para "fora do ar" (nunca notifica repetidamente a
// cada falha isolada da mesma queda, só na transição).

function parseFirestoreValue(value: any): any {
  if (value == null) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  return null;
}

async function getCurrentStatus(
  accessToken: string,
  projectId: string,
  source: string,
): Promise<boolean | null> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/systemStatus/${source}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) return null; // documento ainda não existe -> primeira checagem
    const data: any = await res.json();
    return data?.fields?.isUp ? parseFirestoreValue(data.fields.isUp) : null;
  } catch {
    return null;
  }
}

async function writeStatus(
  accessToken: string,
  projectId: string,
  source: string,
  isUp: boolean,
): Promise<void> {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/systemStatus/${source}`;
  await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: {
        isUp: { booleanValue: isUp },
        lastChangeAt: { stringValue: new Date().toISOString() },
      },
    }),
  });
}

async function notifyAdmins(accessToken: string, projectId: string, message: string): Promise<void> {
  try {
    const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
    const res = await fetch(queryUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "users" }],
          where: { fieldFilter: { field: { fieldPath: "role" }, op: "EQUAL", value: { stringValue: "admin" } } },
        },
      }),
    });
    if (!res.ok) return;
    const rows: any[] = await res.json();

    for (const row of rows) {
      const doc = row.document;
      if (!doc) continue;
      const tokens = doc.fields?.fcmTokens ? (doc.fields.fcmTokens.arrayValue?.values || []).map((v: any) => v.stringValue) : [];
      for (const token of tokens) {
        await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            message: { token, notification: { title: "ClimaAgora — Aviso do Sistema", body: message } },
          }),
        });
      }
    }
  } catch {
    // Falha ao notificar não deve derrubar a resposta ao usuário.
  }
}

// Chamado em background (context.waitUntil), nunca bloqueia a resposta
// ao usuário que está só pedindo a previsão do tempo.
export async function recordSourceStatus(
  accessToken: string,
  projectId: string,
  source: "inmet" | "open-meteo",
  isUp: boolean,
): Promise<void> {
  const previous = await getCurrentStatus(accessToken, projectId, source);
  if (previous === isUp) return; // sem mudança -> nada a fazer, evita ruído

  await writeStatus(accessToken, projectId, source, isUp);

  // Só notifica na transição de "no ar" para "fora do ar" (evita
  // avisar toda vez que ela volta, e principalmente evita notificar de
  // novo a cada request individual enquanto já está fora do ar).
  if (previous !== null && !isUp) {
    const label = source === "inmet" ? "INMET" : "Open-Meteo";
    await notifyAdmins(accessToken, projectId, `A fonte de dados ${label} parou de responder.`);
  }
  if (previous !== null && isUp && previous === false) {
    const label = source === "inmet" ? "INMET" : "Open-Meteo";
    await notifyAdmins(accessToken, projectId, `A fonte de dados ${label} voltou ao normal.`);
  }
}
