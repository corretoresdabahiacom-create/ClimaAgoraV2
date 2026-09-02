import { useEffect, useState } from "react";
import { Newspaper, ExternalLink, ChevronDown } from "lucide-react";
import type { NewsItem } from "../types";

function timeAgo(iso: string): string {
  const diffH = Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (diffH < 1) return "há poucos minutos";
  if (diffH < 24) return `há ${diffH}h`;
  const days = Math.round(diffH / 24);
  return days === 1 ? "há 1 dia" : `há ${days} dias`;
}

export function NewsPanel({ city, state }: { city: string; state: string }) {
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [scope, setScope] = useState<"city" | "region" | "country">("city");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!city) return;
    let cancelled = false;
    fetch(`/api/news?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`)
      .then((r) => (r.ok ? r.json() : { news: [], scope: "city" }))
      .then((body) => {
        if (!cancelled) {
          setNews(body.news || []);
          setScope(body.scope === "region" ? "region" : body.scope === "country" ? "country" : "city");
        }
      })
      .catch(() => {
        if (!cancelled) setNews([]);
      });
    return () => {
      cancelled = true;
    };
  }, [city, state]);

  // Sem notícia real encontrada -> não renderiza nada (mesma regra dos
  // alertas: nunca mostrar um card vazio/decorativo no lugar de dado real).
  if (!news || news.length === 0) return null;

  const label =
    scope === "city"
      ? `Notícias sobre o clima em ${city}`
      : scope === "region"
        ? `Notícias sobre o clima na região (${state})`
        : "Notícias sobre o clima no Brasil";

  const visibleItems = expanded ? news : news.slice(0, 2);

  return (
    <div className="px-5 mt-5">
      <div className="glass rounded-3xl p-4">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center gap-2 mb-3"
        >
          <Newspaper className="w-4 h-4 text-white/50" />
          <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wide flex-1 text-left">
            {label}
          </p>
          <ChevronDown
            className={`w-4 h-4 text-white/45 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>

        <div className="flex flex-col divide-y divide-white/8">
          {visibleItems.map((item, i) => (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 flex items-start gap-2 group first:pt-0 last:pb-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/85 leading-snug group-hover:text-white">
                  {item.title}
                </p>
                <p className="text-[11px] text-white/58 mt-1">
                  {item.source} · {timeAgo(item.publishedAt)}
                </p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-white/60 shrink-0 mt-0.5" />
            </a>
          ))}
        </div>

        {!expanded && news.length > 2 && (
          <button
            onClick={() => setExpanded(true)}
            className="text-[11px] text-sky-300 font-semibold mt-2"
          >
            Ver mais {news.length - 2} notícia{news.length - 2 > 1 ? "s" : ""}
          </button>
        )}

        <p className="text-[10px] text-white/60 mt-3">Notícias reais via Google News.</p>
      </div>
    </div>
  );
}
