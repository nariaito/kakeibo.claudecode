const CACHE = 'kakeibo-v2';
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
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
