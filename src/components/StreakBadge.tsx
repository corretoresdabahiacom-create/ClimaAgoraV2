import { Flame } from "lucide-react";

export function StreakBadge({ streak }: { streak: number }) {
  if (streak < 2) return null; // só aparece quando já significa algo real
  return (
    <div className="glass rounded-full px-2.5 py-1 flex items-center gap-1">
      <Flame className="w-3.5 h-3.5 text-orange-300" />
      <span className="text-xs font-bold">{streak}</span>
    </div>
  );
}
