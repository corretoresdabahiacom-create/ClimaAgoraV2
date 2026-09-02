// GET /api/year-range-weather?lat=X&lon=Y&startYear=YYYY&endYear=YYYY
//
// Agregado MENSAL de precipitação real, para comparar anos inteiros.
// Busca um ano por vez no Historical Weather API (ERA5) — em vez de uma
// única chamada multi-ano — porque há indício de limite prático de
// ~366 dias por requisição em algumas integrações do Open-Meteo; buscar
// ano a ano é mais seguro e não é mais lento na prática (poucos anos).
//
// Meses no futuro além de ~16 dias a partir de hoje NÃO têm previsão
// real disponível em nenhuma fonte gratuita séria — são marcados como
// indisponíveis, nunca preenchidos com estimativa.

interface Env {}

const MAX_YEARS = 25; // ERA5 cobre desde 1940; limitamos para manter a resposta rápida
const FORECAST_HORIZON_DAYS = 16;

interface MonthPoint {
  yearMonth: string; // "YYYY-MM"
  precipitationSum: number | null;
  tempAvgMax: number | null;
  tempAvgMin: number | null;
  source: "historical" | "forecast" | "partial" | "unavailable";
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

async function fetchYearDaily(
  lat: number,
  lon: number,
  year: number,
  endCap: string | null,
): Promise<{ time: string[]; precip: number[]; tmax: number[]; tmin: number[] }> {
  const start = `${year}-01-01`;
  const end = endCap && endCap < `${year}-12-31` ? endCap : `${year}-12-31`;
  if (end < start) return { time: [], precip: [], tmax: [], tmin: [] };

  try {
    const url =
      `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
      `&start_date=${start}&end_date=${end}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
      `&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return { time: [], precip: [], tmax: [], tmin: [] };
    const data: any = await res.json();
    const d = data?.daily;
    return {
      time: d?.time ?? [],
      precip: d?.precipitation_sum ?? [],
      tmax: d?.temperature_2m_max ?? [],
      tmin: d?.temperature_2m_min ?? [],
    };
  } catch {
    return { time: [], precip: [], tmax: [], tmin: [] };
  }
}

// Busca a fração de previsão real (hoje até o horizonte de ~16 dias) —
// necessária para que o mês corrente inclua a chuva já prevista para os
// dias que ainda faltam, em vez de mostrar só o acumulado parcial dos
// dias que já passaram (o que subestimava o total do mês corrente).
async function fetchForecastDaily(
  lat: number,
  lon: number,
  start: string,
  end: string,
): Promise<{ time: string[]; precip: number[]; tmax: number[]; tmin: number[] }> {
  if (end < start) return { time: [], precip: [], tmax: [], tmin: [] };
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
      `&start_date=${start}&end_date=${end}&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return { time: [], precip: [], tmax: [], tmin: [] };
    const data: any = await res.json();
    const d = data?.daily;
    return {
      time: d?.time ?? [],
      precip: d?.precipitation_sum ?? [],
      tmax: d?.temperature_2m_max ?? [],
      tmin: d?.temperature_2m_min ?? [],
    };
  } catch {
    return { time: [], precip: [], tmax: [], tmin: [] };
  }
}

interface DailySeries {
  time: string[];
  precip: number[];
  tmax: number[];
  tmin: number[];
  daySource: "historical" | "forecast";
}

// Agrega uma ou mais séries diárias (histórica + previsão, quando o mês
// corrente mistura dias já passados com dias ainda previstos) em pontos
// mensais. Cada mês recebe a soma real de TODOS os dias que ele já tem
// dado (nunca uma média disfarçada de acumulado): precipitação é sempre
// soma; temperatura é sempre média simples dos dias com dado. O "source"
// do mês reflete exatamente a mistura de dias que o compõem — nunca
// rotulado como "historical" se ele contém pelo menos um dia de previsão.
function aggregateMonthly(series: DailySeries[]): MonthPoint[] {
  const byMonth = new Map<
    string,
    { precip: number; tmax: number[]; tmin: number[]; hasHistorical: boolean; hasForecast: boolean }
  >();

  for (const s of series) {
    s.time.forEach((date, i) => {
      const ym = date.slice(0, 7);
      if (!byMonth.has(ym)) {
        byMonth.set(ym, { precip: 0, tmax: [], tmin: [], hasHistorical: false, hasForecast: false });
      }
      const bucket = byMonth.get(ym)!;
      if (s.precip[i] != null) bucket.precip += s.precip[i];
      if (s.tmax[i] != null) bucket.tmax.push(s.tmax[i]);
      if (s.tmin[i] != null) bucket.tmin.push(s.tmin[i]);
      if (s.daySource === "historical") bucket.hasHistorical = true;
      else bucket.hasForecast = true;
    });
  }

  return Array.from(byMonth.entries()).map(([yearMonth, b]) => ({
    yearMonth,
    precipitationSum: Math.round(b.precip * 10) / 10,
    tempAvgMax: b.tmax.length ? Math.round((b.tmax.reduce((a, c) => a + c, 0) / b.tmax.length) * 10) / 10 : null,
    tempAvgMin: b.tmin.length ? Math.round((b.tmin.reduce((a, c) => a + c, 0) / b.tmin.length) * 10) / 10 : null,
    source: b.hasHistorical && b.hasForecast ? "partial" : b.hasForecast ? "forecast" : "historical",
  }));
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const lat = parseFloat(url.searchParams.get("lat") || "");
  const lon = parseFloat(url.searchParams.get("lon") || "");
  const startYear = parseInt(url.searchParams.get("startYear") || "", 10);
  const endYear = parseInt(url.searchParams.get("endYear") || "", 10);

  if (isNaN(lat) || isNaN(lon) || isNaN(startYear) || isNaN(endYear) || endYear < startYear) {
    return new Response(JSON.stringify({ error: "Parâmetros inválidos." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (endYear - startYear + 1 > MAX_YEARS) {
    return new Response(
      JSON.stringify({ error: `Intervalo muito longo (máximo ${MAX_YEARS} anos).` }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
  if (startYear < 1940) {
    return new Response(
      JSON.stringify({ error: "O histórico real (ERA5) só cobre a partir de 1940." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toDateStr(today);
  const forecastLimit = new Date(today);
  forecastLimit.setDate(forecastLimit.getDate() + FORECAST_HORIZON_DAYS);
  const forecastLimitStr = toDateStr(forecastLimit);

  // Busca a fração real de previsão (hoje até ~16 dias à frente) uma
  // única vez — o intervalo não depende do ano sendo comparado. Isso é
  // o que faltava antes: sem isso, o mês corrente só somava os dias já
  // passados (histórico), subestimando o total real do mês em curso.
  const forecastRaw = await fetchForecastDaily(lat, lon, todayStr, forecastLimitStr);

  function forecastSliceForYear(year: number) {
    const idxs = forecastRaw.time
      .map((d, i) => (d.startsWith(`${year}-`) ? i : -1))
      .filter((i) => i >= 0);
    return {
      time: idxs.map((i) => forecastRaw.time[i]),
      precip: idxs.map((i) => forecastRaw.precip[i]),
      tmax: idxs.map((i) => forecastRaw.tmax[i]),
      tmin: idxs.map((i) => forecastRaw.tmin[i]),
    };
  }

  const months: MonthPoint[] = [];

  for (let year = startYear; year <= endYear; year++) {
    if (year > today.getFullYear()) {
      // Ano inteiramente no futuro além do horizonte real de previsão
      // (16 dias), exceto pelos raros dias de virada de ano que caem
      // dentro do horizonte de previsão (ex.: hoje 28/dez, previsão
      // real até 13/jan do ano seguinte) — esses dias reais são usados
      // normalmente; o resto do ano permanece marcado como indisponível,
      // sem nenhuma estimativa sazonal fabricada.
      const forecastThisYear = forecastSliceForYear(year);
      const yearMonths =
        forecastThisYear.time.length > 0
          ? aggregateMonthly([{ ...forecastThisYear, daySource: "forecast" }])
          : [];
      months.push(...yearMonths);
      const covered = new Set(yearMonths.map((m) => m.yearMonth));
      for (let m = 1; m <= 12; m++) {
        const key = `${year}-${String(m).padStart(2, "0")}`;
        if (!covered.has(key)) {
          months.push({ yearMonth: key, precipitationSum: null, tempAvgMax: null, tempAvgMin: null, source: "unavailable" });
        }
      }
      continue;
    }

    // Busca real histórica, limitada até ontem (dado real via ERA5).
    const histEndCap = year === today.getFullYear() ? toDateStr(new Date(today.getTime() - 86_400_000)) : null;
    const hist = await fetchYearDaily(lat, lon, year, histEndCap);

    const seriesForYear: DailySeries[] = [];
    if (hist.time.length > 0) seriesForYear.push({ ...hist, daySource: "historical" });

    // Só o ano corrente pode ganhar dias de previsão real (histórico
    // nunca é "completado" com previsão para anos já encerrados).
    if (year === today.getFullYear()) {
      const forecastThisYear = forecastSliceForYear(year);
      if (forecastThisYear.time.length > 0) {
        seriesForYear.push({ ...forecastThisYear, daySource: "forecast" });
      }
    }

    const yearMonths = seriesForYear.length > 0 ? aggregateMonthly(seriesForYear) : [];
    months.push(...yearMonths);

    // Meses do ano corrente sem nenhum dado (nem histórico nem dentro do
    // horizonte real de previsão) ficam explicitamente indisponíveis.
    if (year === today.getFullYear()) {
      const covered = new Set(yearMonths.map((m) => m.yearMonth));
      for (let m = 1; m <= 12; m++) {
        const key = `${year}-${String(m).padStart(2, "0")}`;
        if (!covered.has(key)) {
          months.push({ yearMonth: key, precipitationSum: null, tempAvgMax: null, tempAvgMin: null, source: "unavailable" });
        }
      }
    }
  }

  months.sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));

  return new Response(
    JSON.stringify({
      months,
      source: "Open-Meteo (ERA5 histórico, agregado mensal real)",
    }),
    { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" } },
  );
};
