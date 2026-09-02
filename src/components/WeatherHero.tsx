import { Search, RefreshCw } from "lucide-react";
import { useState } from "react";
import type { WeatherData } from "../types";
import { getWeatherCodeInfo } from "../lib/weatherCodes";

interface Props {
  weather: WeatherData;
  onSearch: (query: string) => void;
  isAdmin?: boolean;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "agora mesmo";
  if (min === 1) return "há 1 minuto";
  if (min < 60) return `há ${min} minutos`;
  const h = Math.round(min / 60);
  return h === 1 ? "há 1 hora" : `há ${h} horas`;
}

// Constrói os pontos de uma linha de tendência real, a partir das
// próximas horas de temperatura já disponíveis (mesmo dado usado na
// Previsão Horária) — nunca um desenho decorativo aleatório.
function buildSparklinePoints(temps: number[], width: number, height: number): string {
  if (temps.length < 2) return "";
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const span = Math.max(max - min, 1);
  const stepX = width / (temps.length - 1);
  return temps
    .map((t, i) => {
      const x = i * stepX;
      const y = height - ((t - min) / span) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function WeatherHero({ weather, onSearch, isAdmin }: Props) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const info = getWeatherCodeInfo(weather.weatherCode);
  const todaySource = weather.daily[0]?.source;
  const sourceLabel = todaySource === "inmet" ? "INMET + Open-Meteo" : "Open-Meteo";

  const nextHours = weather.hourly.slice(0, 12);
  const temps = nextHours.map((h) => h.temp);
  const sparklinePoints = buildSparklinePoints(temps, 300, 40);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    onSearch(query.trim());
    setQuery("");
    setSearching(false);
  }

  return (
    <div className="px-5 pt-4">
      {searching ? (
        <form onSubmit={handleSubmit} className="animate-fade-in mb-4">
          <div className="glass rounded-2xl flex items-center gap-2 pl-4 pr-1.5 py-1.5">
            <Search className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cidade (ex: Salvador, BA)"
              className="bg-transparent outline-none text-sm flex-1 py-1.5 placeholder:text-[var(--text-faint)]"
            />
            <button
              type="submit"
              className="bg-[var(--clay)] text-white text-xs font-semibold rounded-xl px-3.5 py-2 shrink-0"
            >
              Ir
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setSearching(true)}
          className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] mb-3"
        >
          <Search className="w-3 h-3" />
          Buscar outra cidade
        </button>
      )}

      <div className="glass rounded-[20px] p-5">
        <div className="flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)] font-medium">
          <span className="w-[5px] h-[5px] rounded-full bg-[var(--sage)]" />
          {weather.city ? `${weather.city}${weather.state ? `, ${weather.state}` : ""}` : "Sua localização"}
        </div>

        <div className="flex justify-between items-start mt-2.5">
          <div className="text-[58px] font-bold leading-none tracking-tight">
            {Math.round(weather.temp)}
            <span className="text-[26px] font-medium text-[var(--text-secondary)]">°C</span>
          </div>
          <div className="text-right pt-2">
            <div className="text-sm font-semibold">{info.label}</div>
            <div className="text-[11.5px] text-[var(--text-secondary)] mt-1 leading-relaxed">
              Máx {Math.round(weather.tempMax)}° · Mín {Math.round(weather.tempMin)}°
              <br />
              Sensação {Math.round(weather.feelsLike)}°
            </div>
          </div>
        </div>

        {sparklinePoints && (
          <div className="mt-4">
            <div className="flex justify-between text-[10px] text-[var(--text-faint)] font-medium uppercase tracking-wide mb-1.5">
              <span>Tendência de agora</span>
              <span>+{nextHours.length}h</span>
            </div>
            <svg viewBox="0 0 300 40" preserveAspectRatio="none" className="w-full h-10 block">
              <polyline
                points={sparklinePoints}
                fill="none"
                stroke="var(--clay)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        <div className="flex items-center gap-1 text-[10.5px] text-[var(--text-faint)] mt-3">
          <RefreshCw className="w-3 h-3" />
          Atualizado {timeAgo(weather.fetchedAt)}{isAdmin && ` · ${sourceLabel}`}
        </div>
      </div>
    </div>
  );
}
