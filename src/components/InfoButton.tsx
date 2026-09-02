import { useEffect, useState } from "react";
import { Info } from "lucide-react";

interface Props {
  title: string;
  children: React.ReactNode;
  /** Mantido só por compatibilidade com chamadas antigas — não tem mais
      efeito, o popover agora é sempre centralizado na tela. */
  align?: "left" | "right";
}

// Centralizado na tela, sempre — depois de mais de uma tentativa de
// posicionar "perto do botão" com cálculo de borda (que continuou
// vazando/cortando em alguns pontos da tela), essa é a versão à prova
// de erro: não existe cálculo de posição para dar errado, então não
// existe mais como aparecer cortado, ilegível ou fora da tela, em
// nenhum tamanho de aparelho.
export function InfoButton({ title, children }: Props) {
  const [open, setOpen] = useState(false);
  const [isLightTheme, setIsLightTheme] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    setIsLightTheme(document.documentElement.getAttribute("data-theme") === "light");
    setOpen(true);
  }

  // Cores fixas de alto contraste, deliberadamente diferentes da paleta
  // do resto do app — legibilidade máxima é a prioridade aqui, marcado
  // como "no-invert" com cor explícita (não depende da matemática do
  // filtro de inversão do modo claro).
  const popoverBg = isLightTheme ? "#2b2118" : "#ffffff";
  const popoverText = isLightTheme ? "#f5f1ea" : "#111111";
  const popoverTextSoft = isLightTheme ? "rgba(245,241,234,0.75)" : "rgba(17,17,17,0.72)";

  return (
    <>
      <button
        onClick={handleOpen}
        aria-label={`Como funciona: ${title}`}
        className="relative w-5 h-5 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-white/60 hover:text-white/90 hover:bg-white/20 transition"
      >
        {/* Área de toque invisível maior que o círculo visual — melhora
            acessibilidade em telas touch sem alterar o layout apertado
            dos cabeçalhos dos cards. */}
        <span className="absolute -inset-2.5" />
        <Info className="w-3 h-3" />
      </button>

      {open && (
        <div
          className="no-invert fixed inset-0 z-[70] flex items-center justify-center px-6"
          onClick={() => setOpen(false)}
        >
          {/* Camada de fundo só para capturar clique-fora — invisível de
              propósito (feedback anterior: escurecer a tela inteira
              incomoda). */}
          <div
            className="rounded-3xl p-4 w-full max-w-xs shadow-2xl animate-fade-in"
            style={{ background: popoverBg, color: popoverText }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-semibold text-sm mb-2">{title}</p>
            <div
              className="info-popover-content text-xs leading-relaxed flex flex-col gap-2"
              style={{ color: popoverTextSoft }}
            >
              {children}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="mt-3 w-full text-center text-xs font-semibold py-2 rounded-xl"
              style={{ background: isLightTheme ? "rgba(245,241,234,0.1)" : "rgba(17,17,17,0.06)" }}
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}