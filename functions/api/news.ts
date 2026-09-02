// GET /api/news?city=NomeDaCidade&state=UF
//
// Fonte real: NewsData.io — API de notícias construída para consumo
// programático (diferente do Google News RSS, que bloqueava consistente-
// mente com erro 503 quando acessado a partir da infraestrutura do
// Cloudflare — confirmado com teste ao vivo, não é mais usado).
// NewsData.io é uma das poucas APIs de notícia gratuitas que permite
// uso comercial no plano free (200 créditos/dia), diferente da maioria
// dos concorrentes que restringem free tier a uso não-comercial.
//
// Requer chave de API gratuita (NEWSDATA_API_KEY), configurada como
// variável de ambiente no Cloudflare — ver README para instruções de
// cadastro.

interface Env {
  NEWSDATA_API_KEY: string;
}

interface NewsResult {
  items: any[];
  debug: any;
}

async function fetchNewsData(apiKey: string, query: string): Promise<NewsResult> {
  const url = `https://newsdata.io/api/1/latest?apikey=${apiKey}&q=${encodeURIComponent(query)}&country=br`;
  try {
    const res = await fetch(url);
    const debug = { url: url.replace(apiKey, "***"), status: res.status, ok: res.ok };
    if (!res.ok) return { items: [], debug };
    const data: any = await res.json();
    const items = Array.isArray(data?.results) ? data.results : [];
    return { items, debug: { ...debug, itemCount: items.length } };
  } catch (err: any) {
    return { items: [], debug: { url: "erro", error: String(err?.message || err) } };
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const city = url.searchParams.get("city")?.trim();
  const state = url.searchParams.get("state")?.trim() || "";
  const debugMode = url.searchParams.get("debug") === "1";

  if (!city) {
    return new Response(JSON.stringify({ news: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!context.env.NEWSDATA_API_KEY) {
    return new Response(
      JSON.stringify({ news: [], ...(debugMode ? { error: "NEWSDATA_API_KEY não configurada" } : {}) }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  const apiKey = context.env.NEWSDATA_API_KEY;

  // Nível 1: previsão do tempo específica da cidade.
  let { items, debug: debug1 } = await fetchNewsData(apiKey, `previsão do tempo ${city}`);
  let scope: "city" | "region" | "country" = "city";

  // Nível 2: clima na cidade/estado, busca mais ampla.
  let debug2 = null;
  if (items.length === 0) {
    const second = await fetchNewsData(apiKey, `clima ${city} ${state}`.trim());
    items = second.items;
    debug2 = second.debug;
  }

  // Nível 3: clima no estado inteiro.
  let debug3 = null;
  if (items.length === 0 && state) {
    const third = await fetchNewsData(apiKey, `clima tempo ${state}`);
    items = third.items;
    debug3 = third.debug;
    scope = "region";
  }

  // Nível 4: clima no Brasil, última tentativa antes de admitir vazio.
  let debug4 = null;
  if (items.length === 0) {
    const fourth = await fetchNewsData(apiKey, `previsão do tempo Brasil`);
    items = fourth.items;
    debug4 = fourth.debug;
    scope = "country";
  }

  const news = items.slice(0, 8).map((item) => ({
    title: item.title || "",
    link: item.link || "",
    source: item.source_id || "Fonte desconhecida",
    publishedAt: item.pubDate ? new Date(item.pubDate.replace(" ", "T") + "Z").toISOString() : new Date().toISOString(),
  }));

  return new Response(
    JSON.stringify({ news, scope, ...(debugMode ? { debug1, debug2, debug3, debug4 } : {}) }),
    { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=900" } },
  );
};
