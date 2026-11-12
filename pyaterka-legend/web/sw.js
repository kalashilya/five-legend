/* Сервис-воркер «Пятёрки Легенд»: делает сайт устанавливаемым приложением и даёт запуск без сети.
   Страница всегда берётся из сети (чтобы обновления приходили сразу), копия в кэше — только на случай отсутствия интернета. */
const C = 'pl-v1';
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => c.addAll(['/', '/icon-180.png', '/icon-512.png', '/manifest.webmanifest']).catch(() => {}))); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => { if (res.ok && (r.mode === 'navigate' || /\.(png|webmanifest)$/.test(r.url))) { const cp = res.clone(); caches.open(C).then(c => c.put(r.mode === 'navigate' ? '/' : r, cp)); } return res; })
    .catch(() => caches.match(r.mode === 'navigate' ? '/' : r).then(m => m || Response.error())));
});
