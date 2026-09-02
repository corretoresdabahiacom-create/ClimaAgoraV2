const OPTIONS = [7, 10, 14, 16];

interface Props {
  value: number;
  onChange: (days: number) => void;
}

export function ForecastPeriodSelector({ value, onChange }: Props) {
  return (
    <div className="px-5 mt-5">
      <div className="glass rounded-2xl p-1.5 flex gap-1">
        {OPTIONS.map((d) => (
          <button
            key={d}
            onClick={() => onChange(d)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition ${
              value === d ? "bg-white/15 text-white" : "text-white/60"
            }`}
          >
            {d} dias
          </button>
        ))}
      </div>
    </div>
  );
}
