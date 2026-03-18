const CACHE = 'kakeibo-v3';
const FILES = [
  '/kakeibo.claudecode/',
  '/kakeibo.claudecode/index.html',
  '/kakeibo.claudecode/css/style.css',
  '/kakeibo.claudecode/js/app.js',
  '/kakeibo.claudecode/js/storage.js',
  '/kakeibo.claudecode/js/parser.js',
  '/kakeibo.claudecode/js/categorizer.js',
  '/kakeibo.claudecode/js/gmail.js',
  '/kakeibo.claudecode/js/charts.js',
  '/kakeibo.claudecode/icon-192.png',
  '/kakeibo.claudecode/icon-512.png',
  '/kakeibo.claudecode/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
