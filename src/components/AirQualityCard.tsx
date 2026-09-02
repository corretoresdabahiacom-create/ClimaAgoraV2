import { useState } from "react";
import { Wind, ChevronDown } from "lucide-react";
import type { AirQuality } from "../types";

// Escala oficial US AQI (EPA) — categorias e faixas padronizadas
// internacionalmente, não inventadas por este app.
function getAqiLevel(aqi: number) {
  if (aqi <= 50)
    return { label: "Boa", color: "text-emerald-300", bar: "bg-emerald-400", advice: "Ar limpo, sem restrições." };
  if (aqi <= 100)
    return { label: "Moderada", color: "text-amber-300", bar: "bg-amber-400", advice: "Aceitável para a maioria das pessoas." };
  if (aqi <= 150)
    return {
      label: "Ruim p/ sensíveis",
      color: "text-orange-300",
      bar: "bg-orange-400",
      advice: "Grupos sensíveis devem reduzir esforço ao ar livre.",
    };
  if (aqi <= 200)
    return { label: "Ruim", color: "text-red-300", bar: "bg-red-400", advice: "Reduza atividades prolongadas ao ar livre." };
  if (aqi <= 300)
    return { label: "Muito ruim", color: "text-purple-300", bar: "bg-purple-400", advice: "Evite esforço físico ao ar livre." };
  return { label: "Perigosa", color: "text-rose-400", bar: "bg-rose-500", advice: "Evite sair de casa se possível." };
}

export function AirQualityCard({ airQuality }: { airQuality: AirQuality | null }) {
  const [expanded, setExpanded] = useState(false);
  if (!airQuality || airQuality.usAqi == null) return null;

  const level = getAqiLevel(airQuality.usAqi);
  const pct = Math.min(100, (airQuality.usAqi / 300) * 100);

  const allPollutants = [
    { label: "PM2.5", value: airQuality.pm2_5 },
    { label: "PM10", value: airQuality.pm10 },
    { label: "NO₂", value: airQuality.no2 },
    { label: "O₃", value: airQuality.o3 },
    { label: "SO₂", value: airQuality.so2 },
    { label: "CO", value: airQuality.co },
  ].filter((p) => p.value != null);

  return (
    <div className="glass rounded-3xl p-4 h-full flex flex-col relative">
      <div className="flex items-center gap-2 mb-3">
        <Wind className="w-4 h-4 text-white/50" />
        <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wide">
          Qualidade do Ar
        </p>
      </div>

      <div className="flex items-end gap-3 mb-2">
        <span className="text-4xl font-thin">{Math.round(airQuality.usAqi)}</span>
        <span className={`text-sm font-semibold mb-1 ${level.color}`}>{level.label}</span>
      </div>

      <div className="h-1.5 rounded-full bg-black/25 overflow-hidden mb-3">
        <div className={`h-full rounded-full ${level.bar}`} style={{ width: `${pct}%` }} />
      </div>

      <p className="text-xs text-white/55 mt-auto">{level.advice}</p>

      {allPollutants.length > 0 && (
        <>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1 text-[10px] text-white/55 mt-2.5"
          >
            {expanded ? "Ver menos" : "Ver poluentes"}
            <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
          {expanded && (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-white/60 mt-2 animate-fade-in">
              {allPollutants.map((p) => (
                <span key={p.label}>
                  {p.label}: {Math.round(p.value!)} µg/m³
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
