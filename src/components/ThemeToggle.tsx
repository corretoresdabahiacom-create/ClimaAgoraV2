import { Moon, Sun } from "lucide-react";
import type { Theme } from "../hooks/useTheme";

export function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  return (
    <div className="glass rounded-full p-0.5 flex gap-0.5 shrink-0">
      <button
        onClick={() => onChange("dark")}
        aria-label="Tema padrão (escuro)"
        aria-pressed={theme === "dark"}
        className={`p-1.5 sm:p-2 rounded-full transition ${
          theme === "dark" ? "bg-[var(--clay)] text-white" : "text-[var(--text-secondary)]"
        }`}
      >
        <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>
      <button
        onClick={() => onChange("light")}
        aria-label="Tema claro"
        aria-pressed={theme === "light"}
        className={`p-1.5 sm:p-2 rounded-full transition ${
          theme === "light" ? "bg-[var(--clay)] text-white" : "text-[var(--text-secondary)]"
        }`}
      >
        <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>
    </div>
  );
}
