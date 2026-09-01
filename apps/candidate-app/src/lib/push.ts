import { apiFetch } from "./api";

/**
 * W31-09 — Cliente de Web Push da PWA (candidate-app).
 *
 * Fail-closed: sem `NEXT_PUBLIC_VAPID_PUBLIC_KEY` no build, push fica
 * desativado no navegador (nada de prompt, nada de assinatura).
 */

export type PushStatus = {
  ativo: boolean;
  assinaturas: number;
};

export type PushSubscriptionBody = {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string;
};

/** VAPID pública exposta no bundle (chave pública é segura para inlinear). */
export function getVapidPublicKey(): string {
  return (
    (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim() ||
    (typeof window !== "undefined"
      ? (window as unknown as { __NEXT_PUBLIC_VAPID_PUBLIC_KEY?: string })
          .__NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""
      : "")
  );
}

/** Navegador com suporte a service worker + push (HTTPS/secure context). */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Converte a chave VAPID base64url para Uint8Array (padrão Web Push). */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Registra a assinatura de push do dispositivo. Retorna null se o usuário
 * negar permissão ou se push não estiver configurado no build.
 */
export async function requestPushSubscription(): Promise<PushSubscriptionBody | null> {
  if (!isPushSupported()) return null;
  const vapidKey = getVapidPublicKey();
  if (!vapidKey) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const registration = await navigator.serviceWorker.ready;
  const applicationServerKey = urlBase64ToUint8Array(vapidKey);
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey as BufferSource,
  });

  const body: PushSubscriptionBody = {
    endpoint: subscription.endpoint,
    p256dh: subscription.getKey("p256dh")
      ? btoa(
          String.fromCharCode(...new Uint8Array(subscription.getKey("p256dh")!)),
        )
      : "",
    auth: subscription.getKey("auth")
      ? btoa(
          String.fromCharCode(...new Uint8Array(subscription.getKey("auth")!)),
        )
      : "",
    user_agent: window.navigator.userAgent,
  };

  // Persiste no backend — endpoint passa a receber pushes.
  await apiFetch("/notificacoes/push/subscribe", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return body;
}

/** Remove a assinatura local e avisa o backend (unsubscribe). */
export async function unsubscribePush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return false;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  try {
    await apiFetch("/notificacoes/push/unsubscribe", {
      method: "POST",
      body: JSON.stringify({ endpoint }),
    });
  } catch {
    // Fail-closed: não propaga erro de rede no logout/cancelamento.
  }
  return true;
}

/** Consulta status do push no backend (para a UI decidir). */
export function getPushStatus(): Promise<PushStatus> {
  return apiFetch("/notificacoes/push/status");
}