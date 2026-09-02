interface BarData {
  label: string;
  value: number | null;
  isSecondary?: boolean; // ex: comparação do ano passado, cor diferente
  unavailable?: boolean;
}

export function SimpleBarChart({
  data,
  unit,
  height = 140,
}: {
  data: BarData[];
  unit: string;
  height?: number;
}) {
  const values = data.map((d) => d.value ?? 0);
  const max = Math.max(1, ...values);
  // Muitas barras => cada uma precisa de largura mínima suficiente para
  // o rótulo rotacionado não se sobrepor ao vizinho.
  const dense = data.length > 10;
  const itemWidth = dense ? 34 : undefined;

  return (
    <div className="w-full overflow-x-auto pb-1">
      <div
        className="flex items-end gap-1"
        style={{ height: height + (dense ? 34 : 14), minWidth: dense ? data.length * itemWidth! : "100%" }}
      >
        {data.map((d, i) => {
          const pct = d.value != null ? Math.max(2, (d.value / max) * 100) : 0;
          return (
            <div
              key={i}
              className="flex flex-col items-center justify-end shrink-0"
              style={{ width: dense ? itemWidth : undefined, height: "100%" }}
            >
              <div className="flex-1 w-full flex flex-col items-center justify-end" style={{ minWidth: 8 }}>
                {d.unavailable ? (
                  <div className="w-full h-1 rounded-full bg-white/10 mb-2" />
                ) : (
                  <>
                    {d.value != null && d.value > 0 && (
                      <span className="text-[7px] text-white/55 mb-0.5 whitespace-nowrap">
                        {d.value.toFixed(1)}
                      </span>
                    )}
                    <div
                      className={`w-full max-w-[18px] rounded-t-md transition-all ${
                        d.isSecondary ? "bg-white/25" : "bg-gradient-to-t from-sky-500 to-sky-300"
                      }`}
                      style={{ height: `${pct}%` }}
                      title={d.value != null ? `${d.label}: ${d.value}${unit}` : `${d.label}: sem dado`}
                    />
                  </>
                )}
              </div>
              <span
                className="text-[8px] text-white/50 mt-1.5 whitespace-nowrap"
                style={
                  dense
                    ? { transform: "rotate(-55deg)", transformOrigin: "top right", marginTop: 6 }
                    : undefined
                }
              >
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
