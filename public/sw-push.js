/**
 * Service Worker para Web Push.
 * Escopo: raiz do site. Registre com: navigator.serviceWorker.register('/sw-push.js', { scope: '/' })
 */
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = { title: "Notificação", body: "", url: "/" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    data.body = event.data.text();
  }
  const options = {
    body: data.body || data.message || "",
    icon: "/icon.png",
    badge: "/icon.png",
    data: { url: data.url || "/", id: data.id },
    tag: data.id ? `notif-${data.id}` : undefined,
    renotify: true,
  };
  event.waitUntil(
    self.registration.showNotification(data.title || "Câmara na Mão", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  const fullUrl = new URL(url, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.navigate(fullUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(fullUrl);
    })
  );
});
