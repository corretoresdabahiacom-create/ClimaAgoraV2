// GET /api/health-alerts?lat=X&lon=Y
//
// Fonte real: InfoDengue (info.dengue.mat.br) — projeto do Programa de
// Computação Científica da Fiocruz em parceria com a FGV e o Ministério
// da Saúde, alimentado pelo SINAN (mesmo sistema oficial de notificação
// compulsória usado por todas as secretarias de saúde do Brasil).
//
// Cobertura real: nem todo município brasileiro tem monitoramento ativo
// no sistema — cidades pequenas podem não aparecer. Nesses casos,
// retornamos honestamente vazio, nunca um nível de alerta inventado.

import { resolveIbgeCode } from "../_shared/ibgeMunicipios";
import { stateNameToUf } from "../_shared/brazilStates";

interface Env {}

const NOMINATIM_USER_AGENT = "ClimaAgora/2.0 (contato via app; uso nao comercial)";
const DISEASES = ["dengue", "zika", "chikungunya"] as const;

const LEVEL_LABELS: Record<number, string> = {
  1: "Baixo",
  2: "Atenção",
  3: "Alerta",
  4: "Epidemia",
};

interface DiseaseAlert {
  disease: (typeof DISEASES)[number];
  level: number;
  levelLabel: string;
  casesReported: number;
  casesEstimated: number;
  incidencePer100k: number;
  epidemiologicalWeek: string;
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

async function fetchDiseaseData(
  geocode: number,
  disease: (typeof DISEASES)[number],
  year: number,
): Promise<DiseaseAlert | null> {
  try {
    const url =
      `https://info.dengue.mat.br/api/alertcity?geocode=${geocode}&disease=${disease}` +
      `&format=json&ew_start=1&ew_end=53&ey_start=${year}&ey_end=${year}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data: any = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    // A API retorna as semanas em ordem decrescente (mais recente
    // primeiro) — confirmado observando o formato real da resposta.
    const latest = data[0];
    if (latest?.nivel == null) return null;

    return {
      disease,
      level: latest.nivel,
      levelLabel: LEVEL_LABELS[latest.nivel] || "Desconhecido",
      casesReported: Math.round(latest.casos ?? 0),
      casesEstimated: Math.round(latest.casos_est ?? 0),
      incidencePer100k: Math.round((latest.p_inc100k ?? 0) * 10) / 10,
      epidemiologicalWeek: String(latest.SE ?? ""),
    };
  } catch {
    return null;
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const lat = parseFloat(url.searchParams.get("lat") || "");
  const lon = parseFloat(url.searchParams.get("lon") || "");

  if (isNaN(lat) || isNaN(lon)) {
    return new Response(JSON.stringify({ available: false, alerts: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const location = await reverseGeocode(lat, lon);
  const uf = stateNameToUf(location?.state);
  if (!location?.city || !uf) {
    return new Response(JSON.stringify({ available: false, alerts: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const geocode = await resolveIbgeCode(location.city, uf);
  if (!geocode) {
    return new Response(JSON.stringify({ available: false, alerts: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const now = new Date();
  let year = now.getFullYear();

  let results = await Promise.all(DISEASES.map((d) => fetchDiseaseData(Number(geocode), d, year)));

  // Início de ano: a semana epidemiológica 1 pode ainda não ter sido
  // publicada — tenta o ano anterior como fallback real (não inventado).
  if (results.every((r) => r === null)) {
    year -= 1;
    results = await Promise.all(DISEASES.map((d) => fetchDiseaseData(Number(geocode), d, year)));
  }

  const alerts = results.filter((r): r is DiseaseAlert => r !== null);

  return new Response(
    JSON.stringify({
      available: alerts.length > 0,
      city: location.city,
      state: uf,
      alerts,
      source: "InfoDengue (Fiocruz/FGV/Ministério da Saúde)",
    }),
    { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=21600" } },
  );
};
