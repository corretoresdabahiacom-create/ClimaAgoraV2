import { Sun } from "lucide-react";

// Escala oficial de índice UV da Organização Mundial da Saúde — não é uma
// classificação inventada, é o padrão internacional usado por qualquer
// serviço meteorológico (INMET incluso).
function getUvLevel(uv: number): { label: string; color: string; advice: string } {
  if (uv < 3) {
    return {
      label: "Baixo",
      color: "text-emerald-300",
      advice: "Pode ficar ao ar livre com segurança.",
    };
  }
  if (uv < 6) {
    return {
      label: "Moderado",
      color: "text-amber-300",
      advice: "Use protetor solar e óculos escuros ao meio-dia.",
    };
  }
  if (uv < 8) {
    return {
      label: "Alto",
      color: "text-orange-300",
      advice: "Proteção necessária: chapéu, protetor solar e sombra.",
    };
  }
  if (uv < 11) {
    return {
      label: "Muito alto",
      color: "text-red-300",
      advice: "Evite o sol das 10h às 16h. Proteção extra necessária.",
    };
  }
  return {
    label: "Extremo",
    color: "text-purple-300",
    advice: "Evite exposição ao sol. Risco de queimadura em minutos.",
  };
}

export function UvIndexCard({ uvIndex }: { uvIndex: number }) {
  const level = getUvLevel(uvIndex);
  const pct = Math.min(100, (uvIndex / 11) * 100);

  return (
    <div className="glass rounded-3xl p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <Sun className="w-4 h-4 text-white/50" />
        <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wide">
          Índice UV
        </p>
      </div>
      <div className="flex items-end gap-3 mb-2">
        <span className="text-4xl font-thin">{Math.round(uvIndex)}</span>
        <span className={`text-sm font-semibold mb-1 ${level.color}`}>
          {level.label}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-black/25 overflow-hidden mb-3">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-purple-400"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-white/55 mt-auto">{level.advice}</p>
    </div>
  );
}
