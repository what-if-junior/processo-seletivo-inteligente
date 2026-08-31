import { apiFetch } from "./api";
import type { ReutilizavelExigencia } from "./document-reuse";

/**
 * W6 delivery info mirrored from backend `GET /documentos/reutilizaveis`
 * (REQ-1.6). `configurado: false` means the edital has NO entrega delivery
 * config — the honest empty state (W26-06), never the mock catalogue.
 */
export type ChecklistEntregaInfo = {
  configurado: boolean;
  pode_upload: boolean;
  uploads_ocultos: boolean;
  modo?: "PRESENCIAL" | "ONLINE";
  subtipo_online?:
    | "UPLOAD_NATIVO_PWA"
    | "URL_FORMULARIO_EXTERNO"
    | "EMAIL_INSTITUCIONAL"
    | null;
  local_nome?: string | null;
  endereco?: string | null;
  horario?: string | null;
  contactos?: string | null;
  url_externa?: string | null;
  email_institucional?: string | null;
  instrucoes?: string | null;
};

export type DocsChecklist = {
  exigencias: ReutilizavelExigencia[];
  configurado: boolean;
  pode_upload: boolean;
  uploads_ocultos: boolean;
  entrega: ChecklistEntregaInfo | null;
};

/**
 * W26-06: classify the delivery config into a UI state so DocsScreen never
 * paints a fake catalogue when the W6 config says uploads aren't available
 * (fail-closed). `loading`/`unconfigured` cover the fetch-not-yet / no-config
 * cases; `presencial` and `canal_externo` are honest non-upload states.
 */
export type ChecklistUiState =
  | { kind: "loading" }
  | { kind: "mock" }
  | { kind: "unconfigured" }
  | { kind: "presencial"; entrega: ChecklistEntregaInfo }
  | { kind: "canal_externo"; entrega: ChecklistEntregaInfo }
  | { kind: "upload"; entrega: ChecklistEntregaInfo | null };

export function docsChecklistUiState(
  checklist: DocsChecklist | null,
  opts: { isMock: boolean },
): ChecklistUiState {
  if (opts.isMock) return { kind: "mock" };
  if (!checklist) return { kind: "loading" };
  if (!checklist.configurado) return { kind: "unconfigured" };
  if (checklist.uploads_ocultos && checklist.entrega) {
    return { kind: "presencial", entrega: checklist.entrega };
  }
  if (!checklist.pode_upload && checklist.entrega) {
    return { kind: "canal_externo", entrega: checklist.entrega };
  }
  if (checklist.pode_upload) return { kind: "upload", entrega: checklist.entrega };
  // Config exists but no entrega detail surfaced → be honest: no uploads.
  return { kind: "canal_externo", entrega: checklist.entrega! };
}

/**
 * W26-06: DocsScreen checklist built from the W6 delivery config, not the
 * hard-coded `DOCS_LIST` mock in the authenticated path.
 */
export async function fetchDocsChecklist(
  candidaturaId: number,
): Promise<DocsChecklist> {
  const res = await apiFetch<DocsChecklist>(
    `/documentos/reutilizaveis?candidatura=${candidaturaId}`,
  );
  return {
    exigencias: res.exigencias ?? [],
    configurado: Boolean(res.configurado),
    pode_upload: Boolean(res.pode_upload),
    uploads_ocultos: Boolean(res.uploads_ocultos),
    entrega: res.entrega ?? null,
  };
}