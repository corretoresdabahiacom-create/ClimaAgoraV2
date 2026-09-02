import { useEffect, useRef, useState } from "react";
import { ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { db, collection, query, where, onSnapshot } from "../lib/firebase";
import type { Advertisement } from "../types";

const AUTOPLAY_INTERVAL_MS = 5000;
const MAX_ADS = 5;

export function AdCarousel() {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [index, setIndex] = useState(0);
  const hoverRef = useRef(false);

  useEffect(() => {
    const q = query(collection(db, "ads"), where("active", "==", true));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Advertisement)
        .sort((a, b) => a.order - b.order)
        .slice(0, MAX_ADS);
      setAds(list);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (ads.length <= 1) return;
    const interval = setInterval(() => {
      if (hoverRef.current) return;
      setIndex((i) => (i + 1) % ads.length);
    }, AUTOPLAY_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [ads.length]);

  if (ads.length === 0) return null;

  const goTo = (i: number) => setIndex(((i % ads.length) + ads.length) % ads.length);
  const ad = ads[index];
  const Wrapper: any = ad.ctaUrl ? "a" : "div";
  const wrapperProps = ad.ctaUrl
    ? { href: ad.ctaUrl, target: "_blank", rel: "noopener noreferrer sponsored" }
    : {};

  return (
    <div
      className="px-5 mt-5 mb-4"
      onMouseEnter={() => (hoverRef.current = true)}
      onMouseLeave={() => (hoverRef.current = false)}
      onTouchStart={() => (hoverRef.current = true)}
      onTouchEnd={() => setTimeout(() => (hoverRef.current = false), 4000)}
    >
      <p className="text-[11px] font-semibold text-white/52 uppercase tracking-wide mb-2 px-1 text-center">
        Publicidade
      </p>

      <div className="relative flex items-center justify-center gap-2 max-w-sm mx-auto">
        {ads.length > 1 && (
          <button
            onClick={() => goTo(index - 1)}
            aria-label="Anúncio anterior"
            className="glass rounded-full p-1.5 shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        <Wrapper
          key={ad.id}
          {...wrapperProps}
          className="glass-strong rounded-2xl overflow-hidden flex flex-col flex-1 min-w-0 animate-fade-in"
        >
          {ad.type !== "text" && ad.imageUrl && (
            <div
              className="h-32 bg-cover bg-center bg-white/5 no-invert"
              style={{ backgroundImage: `url(${ad.imageUrl})` }}
            />
          )}
          <div className="p-4 flex flex-col gap-1.5 text-center items-center">
            <p className="font-semibold text-sm">{ad.title}</p>
            <p className="text-xs text-white/58 line-clamp-3">{ad.description}</p>
            {ad.ctaUrl && (
              <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-sky-300">
                {ad.ctaText || "Saiba mais"}
                <ExternalLink className="w-3 h-3" />
              </span>
            )}
          </div>
        </Wrapper>

        {ads.length > 1 && (
          <button
            onClick={() => goTo(index + 1)}
            aria-label="Próximo anúncio"
            className="glass rounded-full p-1.5 shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {ads.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {ads.map((a, i) => (
            <button
              key={a.id}
              onClick={() => goTo(i)}
              aria-label={`Ver anúncio ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-4 bg-white/70" : "w-1.5 bg-white/25"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
