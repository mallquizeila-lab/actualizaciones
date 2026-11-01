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
