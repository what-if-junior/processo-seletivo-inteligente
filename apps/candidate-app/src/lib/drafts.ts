const STORAGE_KEY = "psi.candidate.drafts.v1";

export type WizardDraft = {
  step: number;
  fields: Record<string, string>;
  updatedAt: string;
};

export type DocDraft = {
  id: string;
  nome: string;
  status: "pendente" | "enviado" | "na";
  updatedAt: string;
};

export type CandidateDrafts = {
  wizard?: WizardDraft;
  docs?: DocDraft[];
};

function readStore(): CandidateDrafts {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CandidateDrafts) : {};
  } catch {
    return {};
  }
}

function writeStore(next: CandidateDrafts): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function loadDrafts(): CandidateDrafts {
  return readStore();
}

export function saveWizardDraft(draft: WizardDraft): CandidateDrafts {
  const next = { ...readStore(), wizard: draft };
  writeStore(next);
  return next;
}

export function saveDocsDraft(docs: DocDraft[]): CandidateDrafts {
  const next = { ...readStore(), docs };
  writeStore(next);
  return next;
}

export function clearDrafts(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

/** Replay hook for when connectivity returns (API sync lands in a later task). */
export function onOnline(callback: (drafts: CandidateDrafts) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => callback(loadDrafts());
  window.addEventListener("online", handler);
  return () => window.removeEventListener("online", handler);
}
