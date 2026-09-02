import { AlertTriangle, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { InmetAlert } from "../types";

// Estilo por nível de severidade real do INMET: 1=Perigo Potencial (amarelo),
// 2=Perigo (laranja), 3=Grande Perigo (vermelho).
const LEVEL_STYLES: Record<number, { bg: string; border: string; text: string }> = {
  1: { bg: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-200" },
  2: { bg: "bg-orange-500/15", border: "border-orange-500/30", text: "text-orange-200" },
  3: { bg: "bg-red-500/15", border: "border-red-500/30", text: "text-red-200" },
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AlertCard({ alert }: { alert: InmetAlert }) {
  const [expanded, setExpanded] = useState(false);
  const style = LEVEL_STYLES[alert.level] ?? LEVEL_STYLES[1];

  return (
    <div className={`rounded-2xl border ${style.bg} ${style.border} p-4`}>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-start gap-3 text-left"
      >
        <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${style.text}`} />
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm ${style.text}`}>{alert.event}</p>
          <p className="text-xs text-white/50 mt-0.5">{alert.severity}</p>
          <p className="text-xs text-white/58 mt-0.5">
            {formatDateTime(alert.startsAt)} até {formatDateTime(alert.endsAt)}
          </p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-white/58 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      {expanded && (
        <div className="mt-3 pl-8 text-sm text-white/75 leading-relaxed space-y-2 animate-fade-in">
          <p>{alert.description}</p>
          {alert.instructions && (
            <p className="text-white/60 text-xs">{alert.instructions}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function AlertsPanel({ alerts }: { alerts: InmetAlert[] }) {
  // Regra: se não há alerta real, o card inteiro é omitido — nunca um
  // "Situação estável" decorativo sem verificação real por trás.
  if (alerts.length === 0) return null;

  return (
    <div className="px-5 mt-5">
      <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wide mb-2 px-1">
        Alertas Oficiais
      </p>
      <div className="flex flex-col gap-2.5">
        {alerts.map((a) => (
          <AlertCard key={a.id} alert={a} />
        ))}
      </div>
      <p className="text-[10px] text-white/60 mt-2 px-1">
        Dados oficiais, via{" "}
        <a
          href="https://radarmeteorologico.com.br"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          radarmeteorologico.com.br
        </a>
        . Em emergência, ligue 199 (Defesa Civil).
      </p>
    </div>
  );
}
