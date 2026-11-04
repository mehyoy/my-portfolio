'use strict';
// Shows notifications sent by the server and opens the app when one is tapped.

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; }
  catch (err) { d = { title: 'Waypoints', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Waypoints', {
    body: d.body || '',
    tag: d.tag || 'waypoints', // same tag replaces the earlier one instead of stacking
    icon: 'icon-192.png',
    data: { open: d.open || '' }
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var open = (e.notification.data && e.notification.data.open) || '';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      if ('focus' in list[i]) {
        list[i].postMessage({ open: open });
        return list[i].focus();
      }
    }
    var url = new URL('./', self.registration.scope);
    if (open) url.searchParams.set('open', open);
    return self.clients.openWindow(url.href);
  }));
});
