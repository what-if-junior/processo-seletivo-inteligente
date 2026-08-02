import { apiFetch, getApiBaseUrl } from "./api";

export type ContestacaoElegibilidade = {
  impugnacao: boolean;
  recurso: boolean;
  etapa_id: number | null;
  template_instrucao_id: number | null;
  instrucao?: { id: number; titulo: string; corpo: string } | null;
  mailto_template?: {
    id: number;
    titulo: string;
    corpo: string;
    origem: string;
  } | null;
};

export type ContestacaoHistoricoItem = {
  id: number;
  canal: string;
  corpo: string;
  enviado_em: string;
  id_template_edital?: number | null;
};

export type ContestacaoRow = {
  id: number;
  tipo: string;
  status: string;
  id_edital?: number | null;
  id_candidatura?: number | null;
  texto: string;
  nome_anexo?: string | null;
  criado_em: string;
  historico?: ContestacaoHistoricoItem[];
};

export function fetchElegibilidade(
  editalId: number,
): Promise<ContestacaoElegibilidade> {
  return apiFetch<ContestacaoElegibilidade>(
    `/contestacoes/elegibilidade?edital=${editalId}`,
  );
}

export function fetchMinhasContestacoes(): Promise<ContestacaoRow[]> {
  return apiFetch<ContestacaoRow[]>("/contestacoes/me");
}

export function fetchContestacao(id: number): Promise<ContestacaoRow> {
  return apiFetch<ContestacaoRow>(`/contestacoes/${id}`);
}

export async function postImpugnacao(opts: {
  id_edital: number;
  texto: string;
  nome_requerente: string;
  email_requerente: string;
  file?: File | null;
}): Promise<ContestacaoRow> {
  const form = new FormData();
  form.append("id_edital", String(opts.id_edital));
  form.append("texto", opts.texto);
  form.append("nome_requerente", opts.nome_requerente);
  form.append("email_requerente", opts.email_requerente);
  if (opts.file) form.append("arquivo", opts.file, opts.file.name);

  // Public — no Authorization required; apiFetch may still attach token if present
  return apiFetch<ContestacaoRow>("/contestacoes/impugnacao", {
    method: "POST",
    body: form,
  });
}

export async function postContestacaoCandidato(opts: {
  tipo: "RECURSO" | "JUSTIFICATIVA";
  id_candidatura: number;
  texto: string;
  file?: File | null;
}): Promise<ContestacaoRow> {
  const form = new FormData();
  form.append("tipo", opts.tipo);
  form.append("id_candidatura", String(opts.id_candidatura));
  form.append("texto", opts.texto);
  if (opts.file) form.append("arquivo", opts.file, opts.file.name);
  return apiFetch<ContestacaoRow>("/contestacoes", {
    method: "POST",
    body: form,
  });
}

export function buildImpugnacaoMailto(opts: {
  templateCorpo: string;
  editalId: number;
  nome: string;
  email: string;
  texto: string;
  to?: string;
}): string {
  let body = opts.templateCorpo
    .replace(/\{\{edital\}\}/g, String(opts.editalId))
    .replace(/\{\{nome\}\}/g, opts.nome)
    .replace(/\{\{email\}\}/g, opts.email)
    .replace(/\{\{texto\}\}/g, opts.texto);
  const subject = encodeURIComponent(`Impugnação — Edital ${opts.editalId}`);
  const encoded = encodeURIComponent(body);
  const to = opts.to || "";
  return `mailto:${to}?subject=${subject}&body=${encoded}`;
}

export function contestacaoAnexoUrl(id: number): string {
  return `${getApiBaseUrl()}/contestacoes/${id}/anexo`;
}
