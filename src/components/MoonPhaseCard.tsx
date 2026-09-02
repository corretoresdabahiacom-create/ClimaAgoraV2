import { useState } from "react";
import { Moon as MoonIcon, CalendarSearch } from "lucide-react";
import { getMoonPhase, getNextPhaseDates, getPhaseRange } from "../lib/moonPhase";

function MoonIllustration({ phase }: { phase: number }) {
  const r = 32;
  const cx = 40;
  const cy = 40;
  const k = Math.cos(2 * Math.PI * phase);
  const terminatorRx = Math.abs(k) * r;
  const wanning = phase > 0.5;

  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16">
      <circle cx={cx} cy={cy} r={r} fill="rgba(255,255,255,0.08)" />
      <clipPath id="moon-clip">
        <circle cx={cx} cy={cy} r={r} />
      </clipPath>
      <g clipPath="url(#moon-clip)">
        <rect x={k >= 0 ? cx : cx - r} y={cy - r} width={r} height={r * 2} fill="#f4f1e8" />
        <ellipse
          cx={cx}
          cy={cy}
          rx={terminatorRx}
          ry={r}
          fill={k >= 0 === wanning ? "rgba(15,23,42,0.85)" : "#f4f1e8"}
        />
      </g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
    </svg>
  );
}

export function MoonPhaseCard() {
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [searching, setSearching] = useState(false);

  const targetDate = new Date(selectedDate + "T12:00:00");
  const info = getMoonPhase(targetDate);
  const { nextNewMoon, nextFullMoon } = getNextPhaseDates(targetDate);
  const phaseRange = getPhaseRange(targetDate);
  const isToday = selectedDate === todayStr;

  const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  return (
    <div className="px-5 mt-5">
      <div className="glass rounded-3xl p-4 flex flex-col items-center text-center">
        <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wide mb-3">
          Fase da Lua {!isToday && `· ${fmt(targetDate)}`}
        </p>

        <MoonIllustration phase={info.phase} />

        <p className="text-base font-semibold mt-2">{info.name}</p>
        <p className="text-xs text-white/50">{info.illumination}% iluminada</p>

        <div className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-1.5 mt-3">
          <span className="text-[11px] text-white/45">Esta fase vai de</span>
          <span className="text-xs font-semibold text-white/90">{fmt(phaseRange.start)}</span>
          <span className="text-[11px] text-white/45">até</span>
          <span className="text-xs font-semibold text-white/90">{fmt(phaseRange.end)}</span>
        </div>

        <div className="flex gap-4 mt-2 text-[11px] text-white/60">
          <span>🌑 Nova: {fmt(nextNewMoon)}</span>
          <span>🌕 Cheia: {fmt(nextFullMoon)}</span>
        </div>

        <button
          onClick={() => setSearching((s) => !s)}
          className="flex items-center gap-1.5 text-[11px] text-sky-300 font-semibold mt-3"
        >
          <CalendarSearch className="w-3.5 h-3.5" />
          Ver lua em outra data
        </button>

        {searching && (
          <div className="flex items-center gap-2 mt-2.5 animate-fade-in">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-black/25 rounded-lg px-2.5 py-1.5 text-xs outline-none"
            />
            {!isToday && (
              <button
                onClick={() => setSelectedDate(todayStr)}
                className="text-[11px] text-white/55 underline"
              >
                Voltar a hoje
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
