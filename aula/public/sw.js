// ProfeTok · service worker: muestra los avisos (push) y abre ProfeTok al tocarlos.
self.addEventListener('install', () => self.skipWaiting());
// 📲 app instalable: si no hay internet, muestra un aviso amable en vez de la página de error
const SIN_RED = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ProfeTok</title><body style="font-family:system-ui;background:#f0f9ff;color:#0b2a5b;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:20px"><div><img src="/icono-192.png" width="96" alt=""><h2>Sin conexión a internet</h2><p>Revisa tu señal o tu wifi y vuelve a intentar.</p><button onclick="location.reload()" style="font:700 1rem system-ui;background:#0284c7;color:#fff;border:0;border-radius:12px;padding:12px 22px">🔄 Reintentar</button></div>';
self.addEventListener('fetch', e => { if (e.request.mode === 'navigate') e.respondWith(fetch(e.request).catch(() => new Response(SIN_RED, { headers: { 'content-type': 'text/html; charset=utf-8' } }))); });
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'ProfeTok', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'ProfeTok', { body: d.body || '', icon: d.icon || '/icono-192.png', badge: '/icono-192.png', image: d.image, tag: d.tag, renotify: !!d.tag, vibrate: d.vibrate || [120, 80, 120, 80, 320], data: { url: d.url || '/' }, lang: 'es' })); // vibración «corta-corta-larga»: el ritmo de ProfeTok
});
self.addEventListener('notificationclick', e => {
  e.notification.close(); const url = e.notification.data?.url || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => { for (const c of l) if (c.url.startsWith(self.location.origin) && 'focus' in c) { c.navigate(url); return c.focus(); } return self.clients.openWindow(url); }));
});
