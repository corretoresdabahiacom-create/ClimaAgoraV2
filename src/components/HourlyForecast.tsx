import { Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudRainWind, CloudLightning, Moon } from "lucide-react";
import type { HourlyPoint } from "../types";
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
  Moon,
};

export function HourlyForecast({ hourly }: { hourly: HourlyPoint[] }) {
  if (!hourly.length) return null;

  return (
    <div className="px-5 mt-5">
      <div className="glass rounded-3xl p-4">
        <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wide mb-3">
          Previsão horária
        </p>
        <div className="flex gap-4 overflow-x-auto scroll-snap-x pb-1">
          {hourly.slice(0, 24).map((h, i) => {
            const info = getWeatherCodeInfo(h.weatherCode);
            const Icon = ICONS[info.icon] ?? Cloud;
            const date = new Date(h.time);
            const label =
              i === 0 ? "Agora" : date.toLocaleTimeString("pt-BR", { hour: "2-digit" });
            return (
              <div
                key={h.time}
                className="snap-item flex flex-col items-center gap-1.5 min-w-[52px]"
              >
                <span className="text-[11px] text-white/55">{label}</span>
                <Icon className="w-5 h-5 my-1" />
                <span className="text-sm font-semibold">{Math.round(h.temp)}°</span>
                <span className="text-[10px] text-sky-300">
                  {Math.round(h.precipitationProbability)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
