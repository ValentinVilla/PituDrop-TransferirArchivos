self.addEventListener('install', (event) => {
  console.log('PituDrop Service Worker instalado');
});

self.addEventListener('fetch', (event) => {
  // Esto permite que la app funcione mejor en red local
  event.respondWith(fetch(event.request));
});