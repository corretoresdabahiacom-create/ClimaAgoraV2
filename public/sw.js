// Service worker do ClimaAgora.
//
// REGRA DE OURO: nunca cachear respostas de /api/* (clima, maré,
// notícias, alertas). Este app existe pra mostrar dado REAL e ATUAL —
// servir uma resposta antiga do cache, mesmo offline, seria mostrar
// informação desatualizada como se fosse fresca. Só o "esqueleto"
// estático (HTML/JS/CSS/ícones) é cacheado, para o app abrir mais rápido
// e funcionar minimamente offline (mostrando a tela, não dados velhos).

const CACHE_NAME = "climaagora-shell-v1";
const SHELL_ASSETS = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Nunca interceptar chamadas de API — sempre rede, sempre dado fresco.
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Para tudo mais (o "esqueleto" do app), tenta a rede primeiro; se
  // falhar (offline), cai pro cache como último recurso.
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return res;
      })
      .catch(() => caches.match(event.request)),
  );
});
