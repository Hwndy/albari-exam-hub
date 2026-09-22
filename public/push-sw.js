self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (_) { payload = {}; }
  const title = payload.title || 'Al-Bari Group of Schools';
  event.waitUntil(self.registration.showNotification(title, {
    body: payload.body || 'You have a new update from Al-Bari.',
    icon: payload.icon || '/albari_logo.jpg',
    badge: payload.badge || '/albari_logo.jpg',
    data: { url: payload.url || '/', ...(payload.data || {}) },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => 'focus' in client);
    if (existing) { existing.navigate(target); return existing.focus(); }
    return clients.openWindow(target);
  }));
});