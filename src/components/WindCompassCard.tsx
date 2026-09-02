function degreesToCardinal(deg: number): string {
  const dirs = ["N", "NE", "L", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(deg / 45) % 8];
}

export function WindCompassCard({
  windSpeed,
  windDirection,
}: {
  windSpeed: number;
  windDirection: number;
}) {
  return (
    <div className="px-5 mt-5">
      <div className="glass rounded-3xl p-4 flex flex-col items-center text-center">
        <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wide mb-3">Vento</p>

        <svg viewBox="0 0 80 80" className="w-16 h-16">
          <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
          <text x="40" y="14" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.4)">N</text>
          <text x="40" y="72" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.4)">S</text>
          <text x="10" y="43" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.4)">O</text>
          <text x="70" y="43" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.4)">L</text>
          <g transform={`rotate(${windDirection}, 40, 40)`}>
            <line x1="40" y1="40" x2="40" y2="12" stroke="#7dd3fc" strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="40,8 35,18 45,18" fill="#7dd3fc" />
          </g>
          <circle cx="40" cy="40" r="3" fill="white" />
        </svg>

        <p className="text-2xl font-thin mt-2">
          {Math.round(windSpeed)} <span className="text-sm text-white/50">km/h</span>
        </p>
        <p className="text-xs text-white/60">
          Direção {degreesToCardinal(windDirection)} ({Math.round(windDirection)}°)
        </p>
      </div>
    </div>
  );
}
