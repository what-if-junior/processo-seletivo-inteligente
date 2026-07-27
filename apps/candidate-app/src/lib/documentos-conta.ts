import { apiFetch } from "./api";

export type DocumentoContaMeta = {
  id: number;
  id_usuario: number;
  id_tipo_base: number;
  nome_arquivo: string;
  mime: string | null;
  atualizado_em: string | Date;
  tipo_nome: string | null;
  tipo_formatos: string[] | null;
};

export type TipoBaseSlot = {
  id: number;
  nome: string;
  formatos: string[];
  ativo: boolean;
  current?: DocumentoContaMeta;
};

type GestaoTipo = {
  id: number;
  nome: string;
  formatos?: string[];
  ativo: boolean;
};

/** Active base types (JWT) for Meus Dados slots — one file per type. */
export async function fetchTiposBaseAtivos(): Promise<GestaoTipo[]> {
  const res = await apiFetch<{ tipos: GestaoTipo[] }>(
    "/tipos-documento-base/gestao",
  );
  return (res.tipos ?? []).filter((t) => t.ativo);
}

export async function fetchDocumentosConta(): Promise<DocumentoContaMeta[]> {
  const res = await apiFetch<{ documentos: DocumentoContaMeta[] }>(
    "/me/documentos-conta",
  );
  return res.documentos ?? [];
}

/** Merge catalog + current uploads into one-slot-per-type rows. */
export function mergeDocumentoContaSlots(
  tipos: GestaoTipo[],
  docs: DocumentoContaMeta[],
): TipoBaseSlot[] {
  const byTipo = new Map(docs.map((d) => [d.id_tipo_base, d]));
  return tipos.map((t) => ({
    id: t.id,
    nome: t.nome,
    formatos: t.formatos ?? [],
    ativo: t.ativo,
    current: byTipo.get(t.id),
  }));
}

export async function upsertDocumentoConta(
  tipoBaseId: number,
  file: File,
): Promise<DocumentoContaMeta> {
  const body = new FormData();
  body.append("arquivo", file);
  return apiFetch<DocumentoContaMeta>(`/me/documentos-conta/${tipoBaseId}`, {
    method: "PUT",
    body,
  });
}

export async function deleteDocumentoConta(tipoBaseId: number): Promise<void> {
  await apiFetch(`/me/documentos-conta/${tipoBaseId}`, { method: "DELETE" });
}
