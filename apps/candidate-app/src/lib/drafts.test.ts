import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearDrafts,
  loadDrafts,
  onOnline,
  saveDocsDraft,
  saveWizardDraft,
} from "./drafts";

afterEach(() => {
  clearDrafts();
  vi.unstubAllGlobals();
});

describe("drafts store", () => {
  it("persists wizard and docs drafts in localStorage", () => {
    saveWizardDraft({
      step: 2,
      fields: { nome: "João" },
      updatedAt: "2026-07-25T00:00:00.000Z",
    });
    saveDocsDraft([
      {
        id: "1",
        nome: "CPF",
        status: "pendente",
        updatedAt: "2026-07-25T00:00:00.000Z",
      },
    ]);

    expect(loadDrafts().wizard?.step).toBe(2);
    expect(loadDrafts().docs?.[0]?.nome).toBe("CPF");
  });

  it("invokes online callback with current drafts", () => {
    const listeners = new Map<string, EventListener>();
    vi.stubGlobal("window", {
      localStorage: globalThis.localStorage,
      addEventListener: (type: string, fn: EventListener) => listeners.set(type, fn),
      removeEventListener: (type: string) => listeners.delete(type),
    });

    saveWizardDraft({
      step: 1,
      fields: {},
      updatedAt: "2026-07-25T00:00:00.000Z",
    });

    const cb = vi.fn();
    const off = onOnline(cb);
    listeners.get("online")?.(new Event("online"));
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ wizard: expect.objectContaining({ step: 1 }) }),
    );
    off();
  });
});
