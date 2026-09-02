// Lógica compartilhada de busca de alertas do INMET — usada tanto por
// /api/alerts (consulta sob demanda, quando o usuário abre o app)
// quanto por /api/check-and-notify-alerts (verificação periódica para
// disparar notificações push).

import { stateNameToUf } from "./brazilStates";
import { resolveIbgeCode } from "./ibgeMunicipios";

const NOMINATIM_USER_AGENT = "ClimaAgora/2.0 (contato via app; uso nao comercial)";
const RADAR_BASE = "https://radarmeteorologico.com.br/api/v1";

export interface InmetAlertResult {
  id: string;
  event: string;
  severity: string;
  level: number;
  description: string;
  instructions: string;
  startsAt: string;
  endsAt: string;
  source: "INMET";
  sourceUrl: string;
}

async function reverseGeocode(lat: number, lon: number) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=pt-BR&zoom=10`;
    const res = await fetch(url, { headers: { "User-Agent": NOMINATIM_USER_AGENT } });
    if (!res.ok) return null;
    const data: any = await res.json();
    const addr = data?.address || {};
    const city =
      addr.city || addr.town || addr.village || addr.municipality || addr.county || "";
    return { city, state: addr.state || "" };
  } catch {
    return null;
  }
}

function toIso(inmetDate: string): string {
  if (!inmetDate) return new Date().toISOString();
  return inmetDate.replace(" ", "T") + ":00-03:00";
}

export async function fetchInmetAlertsForCoords(
  lat: number,
  lon: number,
): Promise<InmetAlertResult[]> {
  const location = await reverseGeocode(lat, lon);
  const uf = stateNameToUf(location?.state);
  if (!location?.city || !uf) return [];

  // Mesma fonte oficial (IBGE) usada em weather.ts e health-alerts.ts —
  // antes esta função usava a busca própria do radarmeteorologico.com.br
  // para achar o código, o que podia (em teoria) resolver um código
  // diferente do usado pelo restante do app para a mesma coordenada.
  // Unificado para garantir que TODA feature do app sempre resolva
  // exatamente o mesmo município para a mesma localização.
  const ibgeCodeStr = await resolveIbgeCode(location.city, uf);
  const ibgeCode = ibgeCodeStr ? Number(ibgeCodeStr) : null;
  if (!ibgeCode) return [];

  try {
    const res = await fetch(`${RADAR_BASE}/alertas?uf=${uf}`);
    if (!res.ok) return [];
    const data: any = await res.json();
    const raw: any[] = data?.alertas || [];
    const matched = raw.filter((a) => Array.isArray(a.geocodes) && a.geocodes.includes(ibgeCode));

    return matched.map((a) => ({
      id: String(a.id),
      event: a.evento,
      severity: a.severidade,
      level: a.nivel,
      description: Array.isArray(a.riscos) ? a.riscos.join(" ") : "",
      instructions: Array.isArray(a.instrucoes) ? a.instrucoes.join(" ") : "",
      startsAt: toIso(a.inicio),
      endsAt: toIso(a.fim),
      source: "INMET" as const,
      sourceUrl: a.url,
    }));
  } catch {
    return [];
  }
}
