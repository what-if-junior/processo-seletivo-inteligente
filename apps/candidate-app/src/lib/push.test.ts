import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isPushSupported,
  urlBase64ToUint8Array,
  requestPushSubscription,
  unsubscribePush,
  getPushStatus,
} from "./push";
import * as api from "./api";

function stubWindowWithPush(overrides: Partial<typeof window> = {}) {
  const sub = {
    endpoint: "https://push.example.com/abc",
    getKey: (name: "p256dh" | "auth") =>
      name === "p256dh"
        ? new Uint8Array([1, 2, 3]).buffer
        : new Uint8Array([4, 5]).buffer,
    unsubscribe: vi.fn().mockResolvedValue(true),
  };

  const navigatorUserAgent = "Vitest/UA";
  // Notification é um global (não window.Notification) no jsdom, mas
  // isPushSupported verifica `"Notification" in window` — precisa estar no stub.
  const NotificationLike = { requestPermission: vi.fn().mockResolvedValue("granted") };
  const windowLike = {
    atob: (b64: string) =>
      Buffer.from(b64, "base64").toString("binary"),
    PushManager: class {},
    Notification: NotificationLike,
    navigator: {
      ...globalThis.navigator,
      userAgent: navigatorUserAgent,
      serviceWorker: {
        ready: Promise.resolve({
          pushManager: {
            subscribe: vi.fn().mockResolvedValue(sub),
            getSubscription: vi.fn().mockResolvedValue(sub),
          },
        }),
      },
    },
    ...overrides,
  };

  vi.stubGlobal("window", windowLike);
  vi.stubGlobal("navigator", windowLike.navigator);
  vi.stubGlobal("Notification", NotificationLike);
  return {
    sub,
    requestPermission: NotificationLike.requestPermission,
    windowLike,
  };
}

describe("push lib", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "abc_public_key-123=";
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  });

  it("isPushSupported true when SW + PushManager + Notification exist", () => {
    stubWindowWithPush();
    expect(isPushSupported()).toBe(true);
  });

  it("isPushSupported false when no PushManager", () => {
    const { windowLike } = stubWindowWithPush();
    delete (windowLike as unknown as Record<string, unknown>).PushManager;
    expect(isPushSupported()).toBe(false);
  });

  it("urlBase64ToUint8Array decodes base64url", () => {
    const arr = urlBase64ToUint8Array("AAEC");
    expect(arr).toEqual(new Uint8Array([0, 1, 2]));
  });

  it("requestPushSubscription posts to backend on grant", async () => {
    stubWindowWithPush();
    const apiFetchSpy = vi
      .spyOn(api, "apiFetch")
      .mockResolvedValue({ id: 1 });

    const result = await requestPushSubscription();

    expect(result).not.toBeNull();
    expect(result?.endpoint).toBe("https://push.example.com/abc");
    expect(result?.user_agent).toBe("Vitest/UA");
    expect(apiFetchSpy).toHaveBeenCalledWith("/notificacoes/push/subscribe", {
      method: "POST",
      body: JSON.stringify({
        endpoint: "https://push.example.com/abc",
        p256dh: "AQID",
        auth: "BAU=",
        user_agent: "Vitest/UA",
      }),
    });
  });

  it("requestPushSubscription returns null when denied", async () => {
    const { requestPermission } = stubWindowWithPush();
    requestPermission.mockResolvedValue("denied");
    const apiFetchSpy = vi
      .spyOn(api, "apiFetch")
      .mockResolvedValue({ id: 1 });

    const result = await requestPushSubscription();

    expect(result).toBeNull();
    expect(apiFetchSpy).not.toHaveBeenCalled();
  });

  it("requestPushSubscription returns null without VAPID key", async () => {
    stubWindowWithPush();
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    const result = await requestPushSubscription();

    expect(result).toBeNull();
  });

  it("unsubscribePush unsubscribes local + notifies backend", async () => {
    stubWindowWithPush();
    const apiFetchSpy = vi
      .spyOn(api, "apiFetch")
      .mockResolvedValue(undefined);

    const result = await unsubscribePush();

    expect(result).toBe(true);
    expect(apiFetchSpy).toHaveBeenCalledWith("/notificacoes/push/unsubscribe", {
      method: "POST",
      body: JSON.stringify({ endpoint: "https://push.example.com/abc" }),
    });
  });

  it("unsubscribePush is safe when no subscription", async () => {
    stubWindowWithPush();
    const navigatorLike = window.navigator as unknown as {
      serviceWorker: {
        ready: Promise<{
          pushManager: { getSubscription: ReturnType<typeof vi.fn> };
        }>;
      };
    };
    const ready = await navigatorLike.serviceWorker.ready;
    (ready.pushManager.getSubscription as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const apiFetchSpy = vi
      .spyOn(api, "apiFetch")
      .mockResolvedValue(undefined);

    const result = await unsubscribePush();

    expect(result).toBe(false);
    expect(apiFetchSpy).not.toHaveBeenCalled();
  });

  it("getPushStatus fetches status endpoint", async () => {
    vi.spyOn(api, "apiFetch").mockResolvedValue({
      ativo: true,
      assinaturas: 2,
    });

    const status = await getPushStatus();

    expect(status).toEqual({ ativo: true, assinaturas: 2 });
    expect(api.apiFetch).toHaveBeenCalledWith("/notificacoes/push/status");
  });
});