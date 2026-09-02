import { useEffect, useState } from "react";
import { Waves, AlertCircle, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

interface TideEvent {
  time: string;
  iso: string;
  height: number;
  high: boolean;
}

interface TideResponse {
  available: boolean;
  status?: string;
  reason?: string;
  portName?: string;
  portState?: string;
  portDistanceKm?: number;
  events?: TideEvent[];
  source?: string;
}

function timeUntil(iso: string): string {
  const diffMin = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (diffMin <= 0) return "agora";
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  if (h === 0) return `em ${m}min`;
  return m === 0 ? `em ${h}h` : `em ${h}h${m}min`;
}

export function TideCard({ lat, lon }: { lat: number; lon: number }) {
  const [data, setData] = useState<TideResponse | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/tide?lat=${lat}&lon=${lon}`)
      .then((r) => r.json())
      .then((body) => {
        if (!cancelled) setData(body);
      })
      .catch(() => {
        if (!cancelled) setData({ available: false, status: "em_atualizacao" });
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lon]);

  // Atualiza o "faltam Xh" a cada minuto, sem precisar refazer a
  // requisição — é só matemática sobre o dado já recebido.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!data) return null;

  if (!data.available) {
    return (
      <div className="px-5 mt-5">
        <div className="glass rounded-3xl p-4 flex items-center gap-3 opacity-80">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-300" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm font-semibold">Tábua de maré — Em atualização</p>
            <p className="text-xs text-white/60 mt-0.5">
              {data.reason || "Não foi possível calcular a maré no momento."} Tente
              novamente mais tarde.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isNearby = (data.portDistanceKm ?? 0) < 15;
  const events = data.events ?? [];
  const nextIndex = events.findIndex((ev) => new Date(ev.iso).getTime() > now);
  const prevEvent = nextIndex > 0 ? events[nextIndex - 1] : null;
  const nextEvent = nextIndex >= 0 ? events[nextIndex] : null;

  // Status "agora mesmo" — derivado da comparação real entre o evento
  // anterior e o próximo, nunca um valor à parte inventado. Perto o
  // bastante de um evento (±15min), consideramos a maré "no pico".
  function computeCurrentStatus(): { label: string; trend: "rising" | "falling" | "peak" } | null {
    if (!nextEvent) return null;
    const minutesToNext = (new Date(nextEvent.iso).getTime() - now) / 60000;
    if (Math.abs(minutesToNext) < 15) {
      return { label: nextEvent.high ? "Maré alta agora" : "Maré baixa agora", trend: "peak" };
    }
    if (!prevEvent) {
      return nextEvent.high
        ? { label: "Maré subindo", trend: "rising" }
        : { label: "Maré descendo", trend: "falling" };
    }
    if (prevEvent.high && !nextEvent.high) return { label: "Maré descendo", trend: "falling" };
    if (!prevEvent.high && nextEvent.high) return { label: "Maré subindo", trend: "rising" };
    return null;
  }
  const currentStatus = computeCurrentStatus();

  return (
    <div className="px-5 mt-5">
      <div className="glass rounded-3xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <Waves className="w-4 h-4 text-white/60" />
          <p className="text-[11px] font-semibold text-white/60 uppercase tracking-wide">
            Tábua de Maré
          </p>
        </div>
        <p className="text-xs text-white/60 mb-3">
          {isNearby
            ? `${data.portName}, ${data.portState}`
            : `Porto mais próximo: ${data.portName}, ${data.portState} (~${data.portDistanceKm} km)`}
        </p>

        {currentStatus && (
          <div className="flex items-center gap-2 bg-sky-500/10 border border-sky-400/25 rounded-xl px-3 py-2 mb-3">
            {currentStatus.trend === "rising" && <ArrowUpCircle className="w-4 h-4 text-sky-300" />}
            {currentStatus.trend === "falling" && <ArrowDownCircle className="w-4 h-4 text-amber-300" />}
            {currentStatus.trend === "peak" && <Waves className="w-4 h-4 text-sky-300" />}
            <span className="text-sm font-semibold">{currentStatus.label}</span>
          </div>
        )}

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {events.map((ev, i) => {
            const isNext = i === nextIndex;
            return (
              <div
                key={i}
                className={`rounded-xl p-2.5 text-center transition-all ${
                  isNext
                    ? "bg-sky-500/20 border border-sky-400/40 scale-[1.03]"
                    : "bg-black/25 border border-transparent"
                }`}
              >
                {ev.high ? (
                  <ArrowUpCircle
                    className={`w-4 h-4 mx-auto ${isNext ? "text-sky-300" : "text-white/50"}`}
                  />
                ) : (
                  <ArrowDownCircle
                    className={`w-4 h-4 mx-auto ${isNext ? "text-amber-300" : "text-white/50"}`}
                  />
                )}
                <p className="text-[10px] text-white/60 mt-1">{ev.time}</p>
                <p className="text-sm font-semibold mt-0.5">{ev.height.toFixed(1)}m</p>
                <p className="text-[9px] text-white/45 mt-0.5">
                  {ev.high ? "Alta" : "Baixa"}
                </p>
                {isNext && (
                  <p className="text-[9px] font-semibold text-sky-300 mt-1">
                    {timeUntil(ev.iso)}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-white/45 mt-3">Fonte: {data.source}</p>
      </div>
    </div>
  );
}
