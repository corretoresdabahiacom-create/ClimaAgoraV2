import { useEffect } from "react";
import { ACHIEVEMENTS } from "../lib/achievements";

export function AchievementToast({
  achievementId,
  onDismiss,
}: {
  achievementId: string | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!achievementId) return;
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [achievementId, onDismiss]);

  if (!achievementId) return null;
  const achievement = ACHIEVEMENTS.find((a) => a.id === achievementId);
  if (!achievement) return null;

  return (
    <div
      className="fixed inset-x-0 z-50 flex justify-center px-5 pointer-events-none"
      style={{ top: "max(5rem, calc(env(safe-area-inset-top) + 0.5rem))" }}
    >
      <div className="glass-strong rounded-2xl px-4 py-3 flex items-center gap-3 max-w-sm animate-fade-in border border-amber-400/30">
        <span className="text-2xl">{achievement.emoji}</span>
        <div>
          <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wide">
            Conquista desbloqueada
          </p>
          <p className="text-sm font-semibold">{achievement.title}</p>
        </div>
      </div>
    </div>
  );
}
