const CACHE_NAME = 'spelling-app-cache-v15';
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './levels.js'
];

// Tahap Instalasi: Menyimpan file ke dalam cache memori
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
});

// Tahap Pengambilan: Menyajikan file dari cache jika tidak ada internet
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Kembalikan file dari cache jika ada, jika tidak ambil dari jaringan
                return response || fetch(event.request);
            })
    );
});
