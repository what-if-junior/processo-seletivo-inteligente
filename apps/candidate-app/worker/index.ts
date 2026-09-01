/// <reference lib="webworker" />
/// <reference lib="es2022" />

/**
 * W31-09 — Custom worker para Web Push (compilado pelo next-pwa e injetado via
 * `importScripts` no /sw.js gerado).
 *
 * Contrato do payload (enviado pelo backend PushService):
 *   { titulo, corpo, deep_link, url }
 */

declare const self: ServiceWorkerGlobalScope;

self.addEventListener("push", (event) => {
  let data: { titulo?: string; corpo?: string; deep_link?: string | null; url?: string | null } = {};
  try {
    const parsed = event.data?.json();
    if (parsed && typeof parsed === "object") data = parsed;
  } catch {
    const text = event.data?.text();
    if (text) data = { titulo: text };
  }

  const titulo = data.titulo ?? "Aviso do processo seletivo";
  const corpo = data.corpo ?? "";
  const url = data.deep_link || data.url || "/";

  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: corpo,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          const prefix = url.split("?")[0] ?? url;
          if (prefix && client.url.startsWith(prefix)) {
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});

export {};