// Çevrimdışı çalışma: önce önbellek, yoksa ağ. Sürümü değiştirince eski önbellek silinir.
const CACHE = 'borcumborc-v1';
const FILES = [
  './', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest',
  'fonts/plus-jakarta-sans-latin-400-normal.woff2', 'fonts/plus-jakarta-sans-latin-600-normal.woff2',
  'fonts/plus-jakarta-sans-latin-700-normal.woff2', 'fonts/plus-jakarta-sans-latin-ext-400-normal.woff2',
  'fonts/plus-jakarta-sans-latin-ext-600-normal.woff2', 'fonts/plus-jakarta-sans-latin-ext-700-normal.woff2',
  'assets/logo.svg', 'assets/mark.svg', 'assets/favicon.svg', 'assets/icon-192.png', 'assets/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) =>
    // Logo dosyaları henüz yoksa kurulum başarısız olmasın: her dosya ayrı eklenir.
    Promise.all(FILES.map((f) => c.add(f).catch(() => null)))
  ).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) =>
    hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match('index.html'))
  ));
});
