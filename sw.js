const CACHE_NAME = "lista-tarefas-v1.1";

// arquivos essenciais (app shell)
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./src/css/base.css",
  "./src/css/responsivo.css",
  "./src/js/script.js",
  "./manifest.json",
  // 🔊 sons essenciais
  "./src/audio/create.ogg",
  "./src/audio/check.ogg",
  "./src/audio/grand_finale_2.ogg"
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
  event.respondWith(
    fetch(event.request)
      .then(response => {
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
  OBS: Eu não configurei essa parte do SW.js sozinho, usei bastante IA e pesquisas na internet
*/
