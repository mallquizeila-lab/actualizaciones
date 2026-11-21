// ProfeTok · service worker: muestra los avisos (push) y abre ProfeTok al tocarlos.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'ProfeTok', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'ProfeTok', { body: d.body || '', icon: d.icon || '/icono-192.png', badge: '/icono-192.png', image: d.image, tag: d.tag, renotify: !!d.tag, vibrate: d.vibrate || [120, 80, 120, 80, 320], data: { url: d.url || '/' }, lang: 'es' })); // vibración «corta-corta-larga»: el ritmo de ProfeTok
});
self.addEventListener('notificationclick', e => {
  e.notification.close(); const url = e.notification.data?.url || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => { for (const c of l) if (c.url.startsWith(self.location.origin) && 'focus' in c) { c.navigate(url); return c.focus(); } return self.clients.openWindow(url); }));
});
