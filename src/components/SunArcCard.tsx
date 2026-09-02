import { Sunrise, Sunset } from "lucide-react";

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function SunArcCard({
  sunrise,
  sunset,
}: {
  sunrise: string | null;
  sunset: string | null;
}) {
  if (!sunrise || !sunset) return null;

  const now = Date.now();
  const riseMs = new Date(sunrise).getTime();
  const setMs = new Date(sunset).getTime();
  const totalDaylightMs = setMs - riseMs;
  const elapsedMs = now - riseMs;
  const progress = Math.min(1, Math.max(0, elapsedMs / totalDaylightMs));
  const isDaytime = now >= riseMs && now <= setMs;

  // Posição do sol ao longo de um semicírculo (arco), de acordo com o
  // progresso real do dia entre nascer e pôr do sol.
  const angle = Math.PI - progress * Math.PI; // PI (esquerda) -> 0 (direita)
  const cx = 100 + 80 * Math.cos(angle);
  const cy = 90 - 80 * Math.sin(angle);

  return (
    <div className="px-5 mt-5">
      <div className="glass rounded-3xl p-4">
        <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wide mb-2">
          Nascer e Pôr do Sol
        </p>
        <svg viewBox="0 0 200 100" className="w-full h-24">
          <path
            d="M 20 90 A 80 80 0 0 1 180 90"
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          {isDaytime && (
            <circle cx={cx} cy={cy} r="7" fill="#fbbf24">
              <animate attributeName="opacity" values="0.85;1;0.85" dur="3s" repeatCount="indefinite" />
            </circle>
          )}
          <circle cx="20" cy="90" r="3" fill="rgba(255,255,255,0.4)" />
          <circle cx="180" cy="90" r="3" fill="rgba(255,255,255,0.4)" />
        </svg>
        <div className="flex justify-between text-sm -mt-2">
          <div className="flex items-center gap-1.5">
            <Sunrise className="w-4 h-4 text-amber-300" />
            <span>{fmtTime(sunrise)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sunset className="w-4 h-4 text-orange-300" />
            <span>{fmtTime(sunset)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
