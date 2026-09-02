import { useState } from "react";
import { Star, X, Plus, Check } from "lucide-react";
import type { FavoriteCity, WeatherData } from "../types";

interface Props {
  favorites: FavoriteCity[];
  currentWeather: WeatherData | null;
  maxFavorites: number;
  onSelect: (lat: number, lon: number) => void;
  onAddCurrent: () => Promise<{ ok: boolean; reason?: string }>;
  onRemove: (id: string) => void;
}

export function FavoriteCitiesBar({
  favorites,
  currentWeather,
  maxFavorites,
  onSelect,
  onAddCurrent,
  onRemove,
}: Props) {
  const [feedback, setFeedback] = useState<string | null>(null);

  const isCurrentSaved =
    !!currentWeather &&
    favorites.some(
      (f) => Math.abs(f.lat - currentWeather.lat) < 0.01 && Math.abs(f.lon - currentWeather.lon) < 0.01,
    );

  async function handleAdd() {
    const result = await onAddCurrent();
    if (!result.ok) {
      const messages: Record<string, string> = {
        limit_reached: `Máximo de ${maxFavorites} cidades salvas.`,
        already_saved: "Essa cidade já está salva.",
        not_logged_in: "Faça login para salvar cidades.",
      };
      setFeedback(messages[result.reason || ""] || "Não foi possível salvar.");
      setTimeout(() => setFeedback(null), 2500);
    }
  }

  if (favorites.length === 0 && !currentWeather) return null;

  return (
    <div className="px-5 mt-3">
      <div className="flex gap-2 overflow-x-auto scroll-snap-x pb-1">
        {favorites.map((f) => {
          const isActive =
            !!currentWeather &&
            Math.abs(f.lat - currentWeather.lat) < 0.01 &&
            Math.abs(f.lon - currentWeather.lon) < 0.01;
          return (
            <div key={f.id} className="snap-item shrink-0 relative group">
              <button
                onClick={() => onSelect(f.lat, f.lon)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition ${
                  isActive ? "bg-white/20 text-white" : "glass text-white/70"
                }`}
              >
                <Star className="w-3 h-3 fill-current" />
                {f.name}
              </button>
              <button
                onClick={() => onRemove(f.id)}
                aria-label={`Remover ${f.name}`}
                className="absolute -top-1.5 -right-1.5 bg-slate-800 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        {currentWeather && (
          <button
            onClick={handleAdd}
            disabled={isCurrentSaved}
            className="snap-item shrink-0 glass rounded-full px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 text-white/70 disabled:opacity-50"
          >
            {isCurrentSaved ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {isCurrentSaved ? "Salvar" : "Salvar cidade"}
          </button>
        )}
      </div>
      {feedback && <p className="text-[11px] text-amber-300 mt-1.5 px-1">{feedback}</p>}
    </div>
  );
}
