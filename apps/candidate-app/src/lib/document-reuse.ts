import { apiFetch } from "./api";

/** Normalize tipo names for REQ-2.6 match (ID and/or nome). */
export function normalizeDocTipoNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export type ReuseExigencia = {
  id_tipo_base?: number | null;
  nome: string;
};

export type ReuseContaCandidate = {
  id: number;
  id_tipo_base: number;
  tipo_nome?: string | null;
};

export type ReuseMatch = {
  id: number;
  match_by: "id_tipo_base" | "nome";
};

/** Match Meus Dados doc to an edital exigência (id_tipo_base, then nome). */
export function matchDocumentoConta(
  exigencia: ReuseExigencia,
  contaDocs: ReuseContaCandidate[],
): ReuseMatch | null {
  if (!contaDocs.length) return null;

  const baseId = exigencia.id_tipo_base;
  if (baseId != null && Number(baseId) > 0) {
    const byId = contaDocs.find((d) => Number(d.id_tipo_base) === Number(baseId));
    if (byId) return { id: byId.id, match_by: "id_tipo_base" };
  }

  const target = normalizeDocTipoNome(exigencia.nome || "");
  if (!target) return null;

  const byNome = contaDocs.find((d) => {
    const nome = normalizeDocTipoNome(d.tipo_nome || "");
    return nome.length > 0 && nome === target;
  });
  return byNome ? { id: byNome.id, match_by: "nome" } : null;
}

export type ReutilizavelMatch = {
  id_documento_conta: number;
  id_tipo_base: number;
  nome_arquivo: string;
  mime: string | null;
  atualizado_em: string | Date;
  tipo_nome: string | null;
  match_by: "id_tipo_base" | "nome";
};

export type ReutilizavelExigencia = {
  id_tipo_documento: number;
  nome: string;
  id_tipo_base: number | null;
  fase: string;
  obrigatorio: boolean;
  match: ReutilizavelMatch | null;
};

export async function fetchDocumentosReutilizaveis(
  candidaturaId: number,
): Promise<ReutilizavelExigencia[]> {
  const res = await apiFetch<{ exigencias: ReutilizavelExigencia[] }>(
    `/documentos/reutilizaveis?candidatura=${candidaturaId}`,
  );
  return res.exigencias ?? [];
}

export async function postReutilizarDocumento(body: {
  id_candidatura: number;
  id_tipo_documento?: number;
  tipo?: string;
  id_documento_conta?: number;
  fase?: string;
}): Promise<unknown> {
  return apiFetch("/documentos/reutilizar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Append multipart flag for Meus Dados mirror (W19). */
export function appendEspelharMeusDados(
  form: FormData,
  espelhar: boolean | undefined,
): FormData {
  if (espelhar) {
    form.append("espelhar_meus_dados", "true");
  }
  return form;
}
