const CACHE_NAME = "lista-tarefas-v1.2.7";

// arquivos essenciais (app shell)
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./src/css/base+footer+canva.css",
  "./src/css/header+input.css",
  "./src/css/barra_progresso.css",
  "./src/css/streak+mensagem.css",
  "./src/css/lista+delete.css",
  "./src/css/loja.css",
  "./src/css/responsivo.css",
  "./src/js/script.js",
  "./src/js/confetti.js",
  "./manifest.json",
  // 🔊 sons essenciais
  "./src/audios/create.ogg",
  "./src/audios/check.ogg",
  "./src/audios/grand_finale_2.ogg"
];

// INSTALL → garante offline base
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

// ACTIVATE
self.addEventListener("activate", (event) => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key !== CACHE_NAME && caches.delete(key)))
    )
  );
});

// FETCH (inteligente)
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 🚫 ignora coisas que não são http/https
  if (!url.protocol.startsWith("http")) return;

  // 🚫 só aceita GET
  if (event.request.method !== "GET") return;

  // 🔒 só cacheia coisas do seu próprio site
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (!response || response.status !== 200) {
          return response;
        }

        const clone = response.clone();

        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, clone);
        });

        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

/*
  OBS: Eu não configurei essa parte do SW.js sozinho, usei IA e pesquisas na internet
*/