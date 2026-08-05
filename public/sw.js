/**
 * MySquadGo Service Worker
 * Handles web-push notifications — fires even when the tab is closed.
 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

// ── Push handler ─────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'MySquadGo', {
      body:  data.body  || 'Your plan is ready!',
      icon:  '/favicon.ico',
      badge: '/favicon.ico',
      tag:   'plan-ready',   // replaces any previous plan-ready notification
      renotify: true,
      data:  { url: data.url || '/' },
    })
  );
});

// ── Click handler — open/focus the plan URL ───────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus an existing window at that URL if possible
        for (const client of clientList) {
          if (client.url === targetUrl && 'focus' in client) return client.focus();
        }
        // Otherwise open a new window
        if (clients.openWindow) return clients.openWindow(targetUrl);
      })
  );
});
