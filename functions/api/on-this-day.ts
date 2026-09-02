// GET /api/on-this-day?lat=X&lon=Y
//
// Fonte real: Open-Meteo Historical Weather API (ERA5/ERA5-Land,
// reanálise com dados de estações, radar, satélite e boias — não é
// estimativa, é o registro do que de fato aconteceu). Retorna o clima
// real de exatamente um ano atrás, na mesma coordenada.

interface Env {}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const lat = parseFloat(url.searchParams.get("lat") || "");
  const lon = parseFloat(url.searchParams.get("lon") || "");
  const debugMode = url.searchParams.get("debug") === "1";

  if (isNaN(lat) || isNaN(lon)) {
    return new Response(JSON.stringify({ available: false, reason: "coords_invalidas" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const dateStr = oneYearAgo.toISOString().split("T")[0]; // YYYY-MM-DD

  const archiveUrl =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
    `&start_date=${dateStr}&end_date=${dateStr}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code` +
    `&timezone=auto`;

  try {
    const res = await fetch(archiveUrl);
    const rawText = await res.text();

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          available: false,
          reason: `Open-Meteo Archive respondeu ${res.status}`,
          ...(debugMode ? { debugUrl: archiveUrl, debugStatus: res.status, debugBody: rawText.slice(0, 300) } : {}),
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const data: any = JSON.parse(rawText);
    const d = data?.daily;
    if (!d || !d.time || d.time.length === 0) {
      return new Response(
        JSON.stringify({
          available: false,
          reason: "Resposta sem dados diários",
          ...(debugMode ? { debugUrl: archiveUrl, debugBody: rawText.slice(0, 300) } : {}),
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        available: true,
        date: dateStr,
        tempMax: d.temperature_2m_max?.[0] ?? null,
        tempMin: d.temperature_2m_min?.[0] ?? null,
        precipitationSum: d.precipitation_sum?.[0] ?? null,
        weatherCode: d.weather_code?.[0] ?? null,
        source: "Open-Meteo Historical Weather API (ERA5)",
      }),
      { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=86400" } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        available: false,
        reason: "Erro de conexão ou parsing",
        ...(debugMode ? { debugUrl: archiveUrl, debugError: String(err?.message || err) } : {}),
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }
};
