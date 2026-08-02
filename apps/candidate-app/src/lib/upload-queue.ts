const QUEUE_KEY = "psi.candidate.uploadQueue.v1";

export type QueuedUpload = {
  id: string;
  candidaturaId: number;
  tipoDocumento: string;
  fase?: string;
  /** data URL or base64 payload */
  dataUrl: string;
  fileName: string;
  mime: string;
  enqueuedAt: string;
  /** When replacing an existing API row */
  replaceId?: number;
  /** W19: mirror into Meus Dados after successful flush */
  espelharMeusDados?: boolean;
};

function readQueue(): QueuedUpload[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedUpload[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedUpload[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export function listUploadQueue(): QueuedUpload[] {
  return readQueue();
}

export function enqueueUpload(
  item: Omit<QueuedUpload, "id" | "enqueuedAt"> & { id?: string },
): QueuedUpload {
  const entry: QueuedUpload = {
    ...item,
    id: item.id ?? `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    enqueuedAt: new Date().toISOString(),
  };
  const next = [...readQueue(), entry];
  writeQueue(next);
  return entry;
}

export function removeUploadFromQueue(id: string): void {
  writeQueue(readQueue().filter((q) => q.id !== id));
}

export function clearUploadQueue(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(QUEUE_KEY);
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, payload] = dataUrl.split(",");
  const mimeMatch = /data:([^;]+)/.exec(meta || "");
  const mime = mimeMatch?.[1] || "application/octet-stream";
  const binary = atob(payload || "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

export type FlushUploadFn = (item: QueuedUpload, blob: Blob) => Promise<void>;

/** Flush queued uploads; removes each item after successful flush. */
export async function flushUploadQueue(
  flushOne: FlushUploadFn,
): Promise<{ flushed: number; failed: number }> {
  const items = readQueue();
  let flushed = 0;
  let failed = 0;
  for (const item of items) {
    try {
      const blob = dataUrlToBlob(item.dataUrl);
      await flushOne(item, blob);
      removeUploadFromQueue(item.id);
      flushed += 1;
    } catch {
      failed += 1;
    }
  }
  return { flushed, failed };
}

export function onOnlineFlush(
  flushOne: FlushUploadFn,
  onResult?: (r: { flushed: number; failed: number }) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => {
    void flushUploadQueue(flushOne).then((r) => onResult?.(r));
  };
  window.addEventListener("online", handler);
  return () => window.removeEventListener("online", handler);
}

export function isBrowserOffline(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.onLine === false;
}
