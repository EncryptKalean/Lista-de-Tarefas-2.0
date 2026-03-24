const CACHE_NAME = "Lista-Tarefas-v1.1.2";

const urlsToCache = [
  "./",
  "./index.html",
  "./src/css/base.css",
  "./src/js/script.js",
  "./manifest.json",
  "./src/imagens/APP-192.png",
  "./src/imagens/APP-500.png",
  "./src/audios/create.ogg"
];

// INSTALL
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// ACTIVATE
self.addEventListener("activate", (event) => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }))
    )
  );
});

// FETCH (network first com fallback seguro)
self.addEventListener("fetch", (event) => {
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
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
