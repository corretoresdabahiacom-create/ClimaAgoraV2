import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Firebase é, de longe, a maior dependência (auth + firestore +
          // messaging) — isolar num chunk próprio permite que o navegador
          // baixe em paralelo com o código do app, e cacheie
          // separadamente (Firebase muda com menos frequência que o
          // restante do código, então o cache dele "dura" mais entre
          // deploys).
          firebase: ["firebase/app", "firebase/auth", "firebase/firestore", "firebase/messaging"],
          // Ícones também pesam sozinhos por causa da quantidade usada
          // em todo o app.
          icons: ["lucide-react"],
        },
      },
    },
  },
});
