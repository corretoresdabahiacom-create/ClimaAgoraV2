import { useEffect, useState } from "react";

// Mede a largura REAL da janela via JavaScript (window.innerWidth),
// como garantia extra além do CSS — alguns navegadores embutidos (ex:
// o WebView do WhatsApp) já relataram, na prática, uma largura de
// viewport diferente da área realmente visível, fazendo media queries
// de CSS (@media, breakpoints) dispararem de forma incorreta. Medir
// direto via JS e travar o layout nesse valor real é mais confiável.
export function useRealViewportWidth() {
  const [width, setWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 400,
  );

  useEffect(() => {
    function handleResize() {
      setWidth(window.innerWidth);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  return width;
}
