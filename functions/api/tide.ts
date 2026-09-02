// GET /api/tide?lat=X&lon=Y
//
// Fonte real: constantes harmônicas publicadas (TICON-4/GESLA-4 e NOAA,
// via o banco de dados aberto @neaps/tide-database, licença CC BY 4.0),
// calculadas com o motor @neaps/tide-predictor — validado publicamente
// contra as previsões oficiais da NOAA (erro de tempo < 1 min na mediana,
// erro de altura na casa dos milímetros). Diferente da tentativa anterior
// (raspagem do site da Marinha), este cálculo roda inteiramente por
// matemática local, sem depender de nenhum site externo estar no ar.
//
// Cobertura: 23 estações reais brasileiras (Rio Grande/RS até Amapá),
// extraídas uma única vez do banco @neaps/tide-database e embutidas em
// functions/_shared/brazilTideStations.json — mantendo a Function leve
// o suficiente para rodar no Cloudflare (o banco completo tem 6.100+
// estações do mundo todo e pesaria dezenas de MB).
//
// AVISO (herdado da biblioteca): não é para uso em navegação real —
// previsão astronômica pura, sem considerar ressaca meteorológica,
// tsunamis ou eventos extremos.

import { createTidePredictor, constituents as speedTable } from "@neaps/tide-predictor";
import brazilStations from "../_shared/brazilTideStations.json";

interface Env {}

interface BrazilStation {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  timezone: string;
  chartDatum: string;
  harmonics: { name: string; amplitude: number; phase: number }[];
}

function findNearestBrazilStation(lat: number, lon: number): { station: BrazilStation; distanceKm: number } {
  let nearest = brazilStations[0] as BrazilStation;
  let minDist = Infinity;
  for (const s of brazilStations as BrazilStation[]) {
    const d = Math.hypot(s.lat - lat, s.lon - lon);
    if (d < minDist) {
      minDist = d;
      nearest = s;
    }
  }
  // Conversão aproximada de graus para km (suficiente para exibir a
  // distância ao usuário, não usada em nenhum cálculo de maré em si).
  return { station: nearest, distanceKm: Math.round(minDist * 111) };
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const lat = parseFloat(url.searchParams.get("lat") || "");
  const lon = parseFloat(url.searchParams.get("lon") || "");

  if (isNaN(lat) || isNaN(lon)) {
    return new Response(JSON.stringify({ available: false, reason: "coords_invalidas" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { station, distanceKm } = findNearestBrazilStation(lat, lon);

    // Monta a lista de constituintes no formato exigido pelo motor:
    // cada uma precisa de nome, amplitude e fase (dados reais da
    // estação) + velocidade angular (constante astronômica universal,
    // igual em qualquer lugar do mundo, já embutida na biblioteca).
    const fullConstituents = station.harmonics
      .map((h) => {
        const def = (speedTable as any)[h.name];
        if (!def) return null; // ignora constituintes que a lib não conhece
        return { name: h.name, amplitude: h.amplitude, phase: h.phase, speed: def.speed };
      })
      .filter(Boolean) as { name: string; amplitude: number; phase: number; speed: number }[];

    if (fullConstituents.length === 0) {
      return new Response(
        JSON.stringify({
          available: false,
          status: "em_atualizacao",
          reason: "Não foi possível montar as constantes harmônicas da estação.",
          portName: station.name,
          portState: station.region,
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const predictor = createTidePredictor(fullConstituents);

    const now = new Date();
    const start = new Date(now.getTime() - 3 * 60 * 60 * 1000); // margem pra trás
    const end = new Date(now.getTime() + 30 * 60 * 60 * 1000); // ~1,25 dia à frente

    const extremes = predictor.getExtremesPrediction({ start, end });

    const events = extremes.slice(0, 6).map((ev: any) => ({
      time: new Date(ev.time).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: station.timezone || "America/Bahia",
      }),
      iso: new Date(ev.time).toISOString(),
      height: Math.round(ev.level * 100) / 100,
      high: ev.high,
    }));

    return new Response(
      JSON.stringify({
        available: true,
        portName: station.name,
        portState: station.region,
        portDistanceKm: distanceKm,
        events,
        source: "Constantes harmônicas TICON-4/NOAA (via @neaps)",
        fetchedAt: new Date().toISOString(),
      }),
      { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        available: false,
        status: "em_atualizacao",
        reason: `Falha no cálculo de maré: ${String(err?.message || err).slice(0, 150)}`,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }
};
