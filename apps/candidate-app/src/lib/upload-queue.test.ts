import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearUploadQueue,
  dataUrlToBlob,
  enqueueUpload,
  flushUploadQueue,
  listUploadQueue,
  onOnlineFlush,
  removeUploadFromQueue,
} from "./upload-queue";

afterEach(() => {
  clearUploadQueue();
  vi.unstubAllGlobals();
});

describe("upload offline queue", () => {
  it("enqueues and lists uploads in localStorage", () => {
    enqueueUpload({
      candidaturaId: 1,
      tipoDocumento: "CPF",
      dataUrl: "data:application/pdf;base64,AAA",
      fileName: "cpf.pdf",
      mime: "application/pdf",
    });
    expect(listUploadQueue()).toHaveLength(1);
    expect(listUploadQueue()[0]?.tipoDocumento).toBe("CPF");
  });

  it("removes items and converts data URL to blob", () => {
    const item = enqueueUpload({
      candidaturaId: 2,
      tipoDocumento: "RG",
      dataUrl: "data:image/png;base64,aGVsbG8=",
      fileName: "rg.png",
      mime: "image/png",
    });
    const blob = dataUrlToBlob(item.dataUrl);
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBeGreaterThan(0);
    removeUploadFromQueue(item.id);
    expect(listUploadQueue()).toHaveLength(0);
  });

  it("flushes queue calling uploader and drops successes", async () => {
    enqueueUpload({
      candidaturaId: 1,
      tipoDocumento: "A",
      dataUrl: "data:text/plain;base64,YQ==",
      fileName: "a.txt",
      mime: "text/plain",
    });
    enqueueUpload({
      candidaturaId: 1,
      tipoDocumento: "B",
      dataUrl: "data:text/plain;base64,Yg==",
      fileName: "b.txt",
      mime: "text/plain",
    });

    const flushOne = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("network"));

    const result = await flushUploadQueue(flushOne);
    expect(result.flushed).toBe(1);
    expect(result.failed).toBe(1);
    expect(listUploadQueue()).toHaveLength(1);
    expect(listUploadQueue()[0]?.tipoDocumento).toBe("B");
  });

  it("registers online flush handler", async () => {
    const listeners = new Map<string, EventListener>();
    vi.stubGlobal("window", {
      localStorage: globalThis.localStorage,
      addEventListener: (type: string, fn: EventListener) =>
        listeners.set(type, fn),
      removeEventListener: (type: string) => listeners.delete(type),
    });

    enqueueUpload({
      candidaturaId: 1,
      tipoDocumento: "CPF",
      dataUrl: "data:application/pdf;base64,AAA",
      fileName: "cpf.pdf",
      mime: "application/pdf",
    });

    const flushOne = vi.fn().mockResolvedValue(undefined);
    const onResult = vi.fn();
    const off = onOnlineFlush(flushOne, onResult);
    listeners.get("online")?.(new Event("online"));
    await vi.waitFor(() => expect(onResult).toHaveBeenCalled());
    expect(flushOne).toHaveBeenCalled();
    off();
  });
});
