// v3 — force update: skipWaiting + clients.claim
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(clients.claim()));

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title ?? "🚨 집합!", {
      body: data.body ?? "",
      icon: data.icon || "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [200, 100, 200, 100, 200],
      tag: "gather",
      renotify: true,
      requireInteraction: false,   // 자동으로 사라짐
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((list) => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow("/gathering");
    })
  );
});
