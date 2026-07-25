import { describe, expect, it, vi } from "vitest";

describe("service worker registration", () => {
  it("registers /sw.js when production and supported", async () => {
    const register = vi.fn().mockResolvedValue({});
    vi.stubGlobal("navigator", { serviceWorker: { register } });
    vi.stubEnv("NODE_ENV", "production");

    const { ServiceWorkerRegister } = await import("./ServiceWorkerRegister");
    const { render } = await import("@testing-library/react");
    render(<ServiceWorkerRegister />);

    await vi.waitFor(() => {
      expect(register).toHaveBeenCalledWith("/sw.js");
    });
  });
});
