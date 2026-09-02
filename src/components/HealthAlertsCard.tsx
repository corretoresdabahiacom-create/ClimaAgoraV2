import { useEffect, useState } from "react";
import { Activity } from "lucide-react";

interface DiseaseAlert {
  disease: "dengue" | "zika" | "chikungunya";
  level: number;
  levelLabel: string;
  casesReported: number;
  casesEstimated: number;
  incidencePer100k: number;
  epidemiologicalWeek: string;
}

interface HealthAlertsResponse {
  available: boolean;
  city?: string;
  state?: string;
  alerts?: DiseaseAlert[];
  source?: string;
}

const LEVEL_STYLES: Record<number, { bg: string; border: string; text: string; dot: string }> = {
  1: { bg: "bg-emerald-500/12", border: "border-emerald-500/25", text: "text-emerald-300", dot: "bg-emerald-400" },
  2: { bg: "bg-amber-500/12", border: "border-amber-500/25", text: "text-amber-300", dot: "bg-amber-400" },
  3: { bg: "bg-orange-500/12", border: "border-orange-500/25", text: "text-orange-300", dot: "bg-orange-400" },
  4: { bg: "bg-red-500/12", border: "border-red-500/25", text: "text-red-300", dot: "bg-red-400" },
};

const DISEASE_LABELS: Record<string, string> = {
  dengue: "Dengue",
  zika: "Zika",
  chikungunya: "Chikungunya",
};

export function HealthAlertsCard({ lat, lon }: { lat: number; lon: number }) {
  const [data, setData] = useState<HealthAlertsResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/health-alerts?lat=${lat}&lon=${lon}`)
      .then((r) => r.json())
      .then((body) => {
        if (!cancelled) setData(body);
      })
      .catch(() => {
        if (!cancelled) setData({ available: false });
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lon]);

  // Sem cobertura real para este município -> não renderiza nada.
  if (!data || !data.available || !data.alerts || data.alerts.length === 0) return null;

  return (
    <div className="px-5 mt-5">
      <div className="glass rounded-3xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-white/60" />
          <p className="text-[11px] font-semibold text-white/60 uppercase tracking-wide">
            Alerta de Arboviroses · {data.city}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {data.alerts.map((a) => {
            const style = LEVEL_STYLES[a.level] ?? LEVEL_STYLES[1];
            return (
              <div
                key={a.disease}
                className={`rounded-2xl border ${style.bg} ${style.border} p-3 flex items-center gap-3`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{DISEASE_LABELS[a.disease]}</p>
                  <p className="text-[11px] text-white/55">
                    {a.casesReported} casos notificados · {a.incidencePer100k}/100mil hab.
                  </p>
                </div>
                <span className={`text-[10px] font-bold ${style.text} shrink-0`}>{a.levelLabel}</span>
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-white/45 mt-3">
          Dados reais · {data.source} · Semana epidemiológica {data.alerts[0]?.epidemiologicalWeek}
        </p>
      </div>
    </div>
  );
}
