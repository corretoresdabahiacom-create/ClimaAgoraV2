// GET /api/geocode?q=NomeDaCidade
// Fonte real: Open-Meteo Geocoding API. Se a cidade não for encontrada,
// retorna 404 honesto — nunca uma coordenada de fallback fixa.

interface Env {}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const q = url.searchParams.get("q")?.trim();

  if (!q) {
    return new Response(JSON.stringify({ error: "Parâmetro 'q' é obrigatório." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=pt&format=json`;
    const res = await fetch(geoUrl);
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: "Serviço de busca de cidades indisponível no momento." }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    }
    const data: any = await res.json();
    const result = data?.results?.[0];

    if (!result) {
      return new Response(
        JSON.stringify({ error: `Cidade "${q}" não encontrada.` }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        city: result.name,
        state: result.admin1 || "",
        country: result.country || "",
        lat: result.latitude,
        lon: result.longitude,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Falha de conexão com o serviço de busca de cidades." }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }
};
