// GET /api/date-range-weather?lat=X&lon=Y&start=YYYY-MM-DD&end=YYYY-MM-DD
//
// Fontes reais, sem nenhuma fabricação:
// - Datas passadas (mais de ~5 dias atrás): Open-Meteo Historical
//   Weather API (ERA5 reanálise)
// - Datas dentro dos próximos ~16 dias: Open-Meteo Forecast API
//   (previsão real)
// - Datas além de 16 dias no futuro: SEM DADO — não existe previsão
//   real confiável além desse horizonte em nenhuma fonte gratuita
//   séria. Marcamos explicitamente como indisponível, nunca inventamos.
//
// Sempre busca também o MESMO intervalo de calendário exatamente um ano
// antes, como comparação — esse período está sempre no passado, então
// sempre 100% real via ERA5.

interface Env {}

const MAX_RANGE_DAYS = 366;
const FORECAST_HORIZON_DAYS = 16;

interface DayPoint {
  date: string;
  tempMax: number | null;
  tempMin: number | null;
  precipitationSum: number | null;
  weatherCode: number | null;
  source: "historical" | "forecast" | "unavailable";
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

async function fetchHistoricalRange(
  lat: number,
  lon: number,
  start: string,
  end: string,
): Promise<DayPoint[]> {
  try {
    const url =
      `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
      `&start_date=${start}&end_date=${end}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code` +
      `&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data: any = await res.json();
    const d = data?.daily;
    if (!d?.time) return [];
    return d.time.map((date: string, i: number) => ({
      date,
      tempMax: d.temperature_2m_max?.[i] ?? null,
      tempMin: d.temperature_2m_min?.[i] ?? null,
      precipitationSum: d.precipitation_sum?.[i] ?? null,
      weatherCode: d.weather_code?.[i] ?? null,
      source: "historical" as const,
    }));
  } catch {
    return [];
  }
}

async function fetchForecastRange(
  lat: number,
  lon: number,
  start: string,
  end: string,
): Promise<DayPoint[]> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code` +
      `&start_date=${start}&end_date=${end}&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data: any = await res.json();
    const d = data?.daily;
    if (!d?.time) return [];
    return d.time.map((date: string, i: number) => ({
      date,
      tempMax: d.temperature_2m_max?.[i] ?? null,
      tempMin: d.temperature_2m_min?.[i] ?? null,
      precipitationSum: d.precipitation_sum?.[i] ?? null,
      weatherCode: d.weather_code?.[i] ?? null,
      source: "forecast" as const,
    }));
  } catch {
    return [];
  }
}

async function fetchMixedRange(lat: number, lon: number, start: string, end: string): Promise<DayPoint[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");
  const forecastLimit = addDays(today, FORECAST_HORIZON_DAYS);

  const results: DayPoint[] = [];

  // Parte histórica: tudo antes de hoje.
  if (startDate < today) {
    const histEnd = endDate < today ? end : toDateStr(addDays(today, -1));
    const hist = await fetchHistoricalRange(lat, lon, start, histEnd);
    results.push(...hist);
  }

  // Parte de previsão real: de hoje até no máximo 16 dias à frente.
  if (endDate >= today) {
    const forecastStart = startDate < today ? toDateStr(today) : start;
    const forecastEnd = endDate > forecastLimit ? toDateStr(forecastLimit) : end;
    if (new Date(forecastStart) <= new Date(forecastEnd)) {
      const fc = await fetchForecastRange(lat, lon, forecastStart, forecastEnd);
      results.push(...fc);
    }
  }

  // Parte indisponível: além do horizonte real de previsão.
  if (endDate > forecastLimit) {
    const unavailStart = startDate > forecastLimit ? start : toDateStr(addDays(forecastLimit, 1));
    let cursor = new Date(unavailStart);
    const unavailEnd = new Date(end);
    while (cursor <= unavailEnd) {
      results.push({
        date: toDateStr(cursor),
        tempMax: null,
        tempMin: null,
        precipitationSum: null,
        weatherCode: null,
        source: "unavailable",
      });
      cursor = addDays(cursor, 1);
    }
  }

  return results.sort((a, b) => a.date.localeCompare(b.date));
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const lat = parseFloat(url.searchParams.get("lat") || "");
  const lon = parseFloat(url.searchParams.get("lon") || "");
  const start = url.searchParams.get("start") || "";
  const end = url.searchParams.get("end") || "";

  if (isNaN(lat) || isNaN(lon) || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return new Response(JSON.stringify({ error: "Parâmetros inválidos." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const startDate = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");
  if (endDate < startDate) {
    return new Response(JSON.stringify({ error: "Data final antes da data inicial." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (daysBetween(startDate, endDate) > MAX_RANGE_DAYS) {
    return new Response(
      JSON.stringify({ error: `Intervalo muito longo (máximo ${MAX_RANGE_DAYS} dias). Use a busca por ano para períodos maiores.` }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const current = await fetchMixedRange(lat, lon, start, end);

  // Mesmo intervalo de calendário, exatamente 1 ano antes — sempre no
  // passado, então sempre real via ERA5.
  const lastYearStart = toDateStr(addDays(startDate, -365));
  const lastYearEnd = toDateStr(addDays(endDate, -365));
  const lastYear = await fetchHistoricalRange(lat, lon, lastYearStart, lastYearEnd);

  return new Response(
    JSON.stringify({
      current,
      lastYear,
      source: "Open-Meteo (ERA5 histórico + previsão real até 16 dias)",
    }),
    { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" } },
  );
};
