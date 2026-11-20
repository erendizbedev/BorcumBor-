// Çevrimdışı çalışma: önce önbellek, yoksa ağ. Sürümü değiştirince eski önbellek silinir (activate).
const CACHE = 'borcumborc-v3';
const FILES = [
  './', 'index.html', 'tokens.css', 'style.css', 'app.js', 'sound.js', 'native.js', 'intro.js', 'manifest.webmanifest',
  // Yazı tipleri
  'fonts/plus-jakarta-sans-latin-400-normal.woff2', 'fonts/plus-jakarta-sans-latin-600-normal.woff2',
  'fonts/plus-jakarta-sans-latin-700-normal.woff2', 'fonts/plus-jakarta-sans-latin-ext-400-normal.woff2',
  'fonts/plus-jakarta-sans-latin-ext-600-normal.woff2', 'fonts/plus-jakarta-sans-latin-ext-700-normal.woff2',
  'fonts/bricolage-grotesque-latin-600-normal.woff2', 'fonts/bricolage-grotesque-latin-700-normal.woff2',
  'fonts/bricolage-grotesque-latin-800-normal.woff2', 'fonts/bricolage-grotesque-latin-ext-600-normal.woff2',
  'fonts/bricolage-grotesque-latin-ext-700-normal.woff2', 'fonts/bricolage-grotesque-latin-ext-800-normal.woff2',
  // Marka ve ikonlar
  'assets/icons.svg', 'assets/mark.svg', 'assets/mark-animated.svg', 'assets/logo.svg', 'assets/favicon.svg',
  'assets/icon-192.png', 'assets/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) =>
    // Bir dosya eksikse kurulum tümden başarısız olmasın: her dosya ayrı eklenir.
    Promise.all(FILES.map((f) => c.add(f).catch(() => null)))
  ).then(() => self.skipWaiting()));
});

// Eski sürüm önbellekleri (borcumborc-v1 gibi) temizlenir.
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== self.location.origin) return; // kur API'leri her zaman ağdan (bayat kur olmasın)
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) =>
    hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match('index.html'))
  ));
});
