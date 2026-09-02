// Service worker do Firebase Cloud Messaging.
//
// IMPORTANTE: este arquivo fica em /public, então NÃO passa pelo Vite
// e não consegue ler variáveis de ambiente (import.meta.env). Por isso,
// os valores abaixo precisam ser preenchidos manualmente — copie
// exatamente os mesmos valores do seu arquivo .env (VITE_FIREBASE_*).
// Isso é seguro: são as mesmas chaves que já ficam expostas no
// JavaScript do navegador de qualquer forma, não são segredos.

importScripts("https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyB2_rU8Tp-0vYxfzaCK3EEMr4hKL2ECD28",
  authDomain: "climaagora-v2-completo.firebaseapp.com",
  projectId: "climaagora-v2-completo",
  storageBucket: "climaagora-v2-completo.firebasestorage.app",
  messagingSenderId: "107121144",
  appId: "1:107121144:web:ed6099c02751539228ae0d",
});

const messaging = firebase.messaging();

// Exibe a notificação quando ela chega com o app em segundo plano ou
// fechado. Quando o app está aberto e em foco, é o onMessage() no
// próprio React (usePushNotifications.ts) que trata, não este arquivo.
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "ClimaAgora";
  const body = payload.notification?.body || "";
  self.registration.showNotification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
  });
});
