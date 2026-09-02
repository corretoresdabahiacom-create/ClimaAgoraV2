import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { getWeatherCodeInfo } from "../lib/weatherCodes";

interface OnThisDay {
  available: boolean;
  date?: string;
  tempMax?: number;
  tempMin?: number;
  precipitationSum?: number;
  weatherCode?: number;
  source?: string;
}

export function OnThisDayCard({ lat, lon, isAdmin }: { lat: number; lon: number; isAdmin?: boolean }) {
  const [data, setData] = useState<OnThisDay | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/on-this-day?lat=${lat}&lon=${lon}`)
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

  if (!data || !data.available || data.tempMax == null) return null;

  const info = data.weatherCode != null ? getWeatherCodeInfo(data.weatherCode) : null;
  const year = data.date ? new Date(data.date).getFullYear() : "";

  return (
    <div className="px-5 mt-5">
      <div className="glass rounded-3xl p-4 flex flex-col items-center text-center">
        <div className="flex items-center gap-1.5 mb-3 self-stretch justify-center">
          <History className="w-4 h-4 text-white/60" />
          <p className="text-[11px] font-semibold text-white/60 uppercase tracking-wide">
            Neste dia, em {year}
          </p>
        </div>

        <p className="text-3xl font-thin">
          {Math.round(data.tempMax)}° <span className="text-lg text-white/50">/ {Math.round(data.tempMin!)}°</span>
        </p>
        {info && <p className="text-sm text-white/70 mt-0.5">{info.label}</p>}
        <p className="text-xs text-white/55 mt-1.5">
          {data.precipitationSum != null && data.precipitationSum > 0
            ? `Choveu ${data.precipitationSum.toFixed(1)}mm neste dia`
            : "Sem chuva registrada neste dia"}
        </p>

        <p className="text-[10px] text-white/45 mt-3">
          Dado histórico real{isAdmin && " · Open-Meteo (ERA5)"}
        </p>
      </div>
    </div>
  );
}
