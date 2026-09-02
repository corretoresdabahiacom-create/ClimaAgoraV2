import { Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudRainWind, CloudLightning } from "lucide-react";
import type { DailyPoint } from "../types";
import { getWeatherCodeInfo } from "../lib/weatherCodes";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudRainWind,
  CloudLightning,
};

export function DailyForecast({ daily, isAdmin }: { daily: DailyPoint[]; isAdmin?: boolean }) {
  if (!daily.length) return null;

  const allMax = daily.map((d) => d.tempMax);
  const allMin = daily.map((d) => d.tempMin);
  const globalMax = Math.max(...allMax);
  const globalMin = Math.min(...allMin);
  const span = Math.max(globalMax - globalMin, 1);

  return (
    <div className="px-5 mt-5">
      <div className="glass rounded-3xl p-4">
        <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wide mb-2">
          Previsão de {daily.length} dias
        </p>
        <div className="flex flex-col divide-y divide-white/8">
          {daily.map((d, i) => {
            const info = getWeatherCodeInfo(d.weatherCode);
            const Icon = ICONS[info.icon] ?? Cloud;
            const date = new Date(d.date + "T12:00:00");
            const label =
              i === 0
                ? "Hoje"
                : date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
            const barStart = ((d.tempMin - globalMin) / span) * 100;
            const barWidth = ((d.tempMax - d.tempMin) / span) * 100;

            return (
              <div key={d.date} className="flex flex-col gap-1 py-2.5 text-sm">
                <div className="flex items-center gap-3">
                  <span className="w-9 font-medium capitalize">{label}</span>
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="w-9 text-right text-white/50">
                    {Math.round(d.tempMin)}°
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-black/25 relative overflow-hidden">
                    <div
                      className="absolute h-full rounded-full bg-gradient-to-r from-sky-300 to-amber-300"
                      style={{ left: `${barStart}%`, width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="w-9 font-semibold">{Math.round(d.tempMax)}°</span>
                  {isAdmin && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                        d.source === "inmet"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-sky-500/20 text-sky-300"
                      }`}
                      title={
                        d.source === "inmet"
                          ? "Máx/mín oficial do INMET"
                          : "Máx/mín do Open-Meteo (INMET sem cobertura para esta data)"
                      }
                    >
                      {d.source === "inmet" ? "INMET" : "Open-Meteo"}
                    </span>
                  )}
                </div>
                <p className="text-[10.5px] text-sky-300/80 pl-[76px]">
                  💧 {Math.round(d.precipitationProbability)}% de chance ·{" "}
                  {d.precipitationSum.toFixed(1)}mm previstos
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
