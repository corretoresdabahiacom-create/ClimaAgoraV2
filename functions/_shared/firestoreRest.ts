// Acesso ao Firestore via API REST, autenticado com o token da Service
// Account (escopo "datastore") — isso executa como servidor confiável,
// sem passar pelas Security Rules do cliente (o mesmo princípio do
// Firebase Admin SDK, só que reimplementado com fetch puro porque o
// SDK oficial não roda bem no runtime do Cloudflare Workers).

interface FirestoreUser {
  uid: string;
  fcmTokens: string[];
  favoriteCities: { id: string; name: string; state: string; lat: number; lon: number }[];
  seenAlertIds: string[];
}

function parseFirestoreValue(value: any): any {
  if (value == null) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(parseFirestoreValue);
  if ("mapValue" in value) {
    const obj: any = {};
    for (const [k, v] of Object.entries(value.mapValue.fields || {})) {
      obj[k] = parseFirestoreValue(v);
    }
    return obj;
  }
  return null;
}

function toFirestoreValue(value: any): any {
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "number") return { doubleValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === "object" && value !== null) {
    const fields: any = {};
    for (const [k, v] of Object.entries(value)) fields[k] = toFirestoreValue(v);
    return { mapValue: { fields } };
  }
  return { nullValue: null };
}

export async function listUsersWithPushTokens(
  accessToken: string,
  projectId: string,
): Promise<FirestoreUser[]> {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: "users" }],
    },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Falha ao listar usuários: ${res.status}`);
  const rows: any[] = await res.json();

  const users: FirestoreUser[] = [];
  for (const row of rows) {
    const doc = row.document;
    if (!doc) continue;
    const fields = doc.fields || {};
    const fcmTokens = fields.fcmTokens ? parseFirestoreValue(fields.fcmTokens) : [];
    if (!fcmTokens || fcmTokens.length === 0) continue; // sem token, sem interesse em push

    const uid = doc.name.split("/").pop();
    users.push({
      uid,
      fcmTokens,
      favoriteCities: fields.favoriteCities ? parseFirestoreValue(fields.favoriteCities) : [],
      seenAlertIds: fields.seenAlertIds ? parseFirestoreValue(fields.seenAlertIds) : [],
    });
  }
  return users;
}

export async function updateSeenAlertIds(
  accessToken: string,
  projectId: string,
  uid: string,
  seenAlertIds: string[],
): Promise<void> {
  const url =
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}` +
    `?updateMask.fieldPaths=seenAlertIds`;
  await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { seenAlertIds: toFirestoreValue(seenAlertIds) } }),
  });
}
