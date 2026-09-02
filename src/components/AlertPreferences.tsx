import { useState } from "react";
import { Bell, Settings2, X } from "lucide-react";
import type { AlertPreferences, TriggeredAlert } from "../lib/alertPreferences";

export function TriggeredAlertsBanner({ alerts }: { alerts: TriggeredAlert[] }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const visible = alerts.filter((a) => !dismissed.includes(a.key));
  if (visible.length === 0) return null;

  return (
    <div className="px-5 mt-4 flex flex-col gap-2">
      {visible.map((a) => (
        <div
          key={a.key}
          className="glass-strong rounded-2xl p-3.5 flex items-start gap-2.5 border border-amber-400/25"
        >
          <Bell className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
          <p className="text-sm flex-1">{a.message}</p>
          <button onClick={() => setDismissed((d) => [...d, a.key])} aria-label="Dispensar">
            <X className="w-4 h-4 text-white/58" />
          </button>
        </div>
      ))}
    </div>
  );
}

interface SettingsProps {
  prefs: AlertPreferences;
  onSave: (prefs: AlertPreferences) => void;
}

export function AlertPreferencesCard({ prefs, onSave }: SettingsProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(prefs);

  function field(
    label: string,
    key: keyof AlertPreferences,
    unit: string,
    placeholder: string,
  ) {
    return (
      <label className="flex items-center justify-between gap-3">
        <span className="text-xs text-white/70">{label}</span>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={draft[key] ?? ""}
            placeholder={placeholder}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                [key]: e.target.value === "" ? null : Number(e.target.value),
              }))
            }
            className="w-16 bg-black/25 rounded-lg px-2 py-1.5 text-sm text-right outline-none"
          />
          <span className="text-xs text-white/45">{unit}</span>
        </div>
      </label>
    );
  }

  return (
    <div className="px-5 mt-5">
      <div className="glass rounded-3xl p-4">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center gap-2"
        >
          <Settings2 className="w-4 h-4 text-white/60" />
          <p className="text-[11px] font-semibold text-white/60 uppercase tracking-wide flex-1 text-left">
            Alertas Personalizados
          </p>
        </button>

        {open && (
          <div className="mt-3 flex flex-col gap-3 animate-fade-in">
            {field("Avisar se chance de chuva ≥", "rainProbabilityThreshold", "%", "ex: 50")}
            {field("Avisar se índice UV ≥", "uvThreshold", "", "ex: 8")}
            {field("Avisar se sensação térmica ≥", "heatThreshold", "°C", "ex: 35")}
            {field("Avisar se temperatura ≤", "coldThreshold", "°C", "ex: 15")}
            <button
              onClick={() => onSave(draft)}
              className="bg-white text-slate-900 text-xs font-semibold rounded-xl py-2 mt-1"
            >
              Salvar preferências
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
