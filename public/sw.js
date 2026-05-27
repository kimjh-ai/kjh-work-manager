self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title ?? "🚨 집합!", {
      body: data.body ?? "",
      icon: data.icon || "/icon-192.png",   // 발신자 프로필 사진 우선
      badge: "/icon-192.png",
      vibrate: [200, 100, 200, 100, 200],
      tag: "gather",
      renotify: true,
      requireInteraction: false,            // 자동으로 사라짐
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
