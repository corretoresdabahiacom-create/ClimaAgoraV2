import { useState } from "react";
import { BellOff, X } from "lucide-react";

export function PushDisabledReminder({
  onReactivate,
}: {
  onReactivate: () => Promise<{ ok: boolean; reason?: string }>;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="px-5 mt-4">
      <div className="glass-strong rounded-2xl p-3.5 flex items-start gap-2.5 border border-amber-400/25 animate-fade-in">
        <BellOff className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm">
            Suas notificações push estão <strong className="text-white/90">desativadas</strong>.
            Você não será avisado automaticamente de novos alertas oficiais.
          </p>
          <button
            onClick={() => onReactivate()}
            className="text-xs font-semibold text-sky-300 mt-1.5"
          >
            Reativar agora
          </button>
        </div>
        <button onClick={() => setDismissed(true)} aria-label="Dispensar aviso">
          <X className="w-4 h-4 text-white/58" />
        </button>
      </div>
    </div>
  );
}
