// Gera um token de acesso OAuth2 do Google a partir de uma Service
// Account (JSON), assinando um JWT com RS256 via Web Crypto API — sem
// depender do SDK "firebase-admin" (que não roda bem no runtime do
// Cloudflare Workers). Esse padrão é a forma documentada e correta de
// autenticar como servidor confiável (bypassa as Security Rules do
// Firestore, e autoriza o envio real de notificações via FCM).

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

function base64UrlEncode(data: ArrayBuffer | string): string {
  let bytes: Uint8Array;
  if (typeof data === "string") {
    bytes = new TextEncoder().encode(data);
  } else {
    bytes = new Uint8Array(data);
  }
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

// Cache simples em memória do isolate — evita gerar um token novo a
// cada chamada dentro da mesma execução (tokens do Google duram 1h).
let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getGoogleAccessToken(
  serviceAccountJson: string,
  scopes: string[],
): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const sa: ServiceAccount = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: sa.client_email,
    scope: scopes.join(" "),
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const unsigned = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claims))}`;
  const key = await importPrivateKey(sa.private_key);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const jwt = `${unsigned}.${base64UrlEncode(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Falha ao obter token do Google: ${res.status} ${body.slice(0, 200)}`);
  }

  const data: any = await res.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

export function getProjectId(serviceAccountJson: string): string {
  const sa: ServiceAccount = JSON.parse(serviceAccountJson);
  return sa.project_id;
}
