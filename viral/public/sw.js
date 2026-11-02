// Notificaciones: muestra el aviso y al tocarlo abre el enlace (que cuenta el clic).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Tienes un mensaje nuevo ✨', {
    body: d.body || 'Toca para verlo', icon: '/icon.png', badge: '/badge.png', image: d.image, tag: d.tag, data: { url: d.url || '/' },
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.openWindow(e.notification.data && e.notification.data.url || '/'));
});
// Hace la página instalable como app y guarda en caché los archivos del juego para que abra más rápido.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return; const u = new URL(e.request.url);
  if (u.origin !== location.origin || u.pathname.startsWith('/api/') || u.pathname.startsWith('/voces/') || u.pathname.startsWith('/c/')) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok && (u.pathname.startsWith('/glory/') || u.pathname.startsWith('/avatares/') || /\.(js|png|webp|svg)$/.test(u.pathname))) { const c = r.clone(); caches.open('glory-v1').then(x => x.put(e.request, c)).catch(() => {}); } return r; })
    .catch(() => caches.match(e.request).then(r => r || new Response('Sin conexión', { status: 503 }))));
});
