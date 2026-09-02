import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Registra o service worker só em produção — em desenvolvimento local
// (npm run dev) ele atrapalharia o hot-reload do Vite.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Falha ao registrar o service worker não deve quebrar o app —
      // ele simplesmente continua funcionando sem suporte offline/PWA.
    });
  });
}
