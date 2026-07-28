import { apiFetch, apiFetchBlob, apiUpload } from "./api";

export type LoteColumnMap = Record<string, string>;

export type LoteIssue = {
  campo?: string;
  severidade: "erro" | "aviso";
  mensagem: string;
};

export type DryRunLinha = {
  linha: number;
  dados: Record<string, string>;
  status: "ok" | "aviso" | "erro";
  issues: LoteIssue[];
};

export type DryRunResult = {
  total: number;
  validos: number;
  avisos: number;
  erros: number;
  linhas: DryRunLinha[];
};

export type CommitResult = {
  dryRun: DryRunResult;
  criados: number;
  ignorados: number;
};

function buildForm(
  file: File,
  encoding: string,
  columnMap: LoteColumnMap,
): FormData {
  const fd = new FormData();
  fd.append("arquivo", file);
  fd.append("encoding", encoding);
  fd.append("columnMap", JSON.stringify(columnMap));
  return fd;
}

export function dryRunContas(
  file: File,
  encoding: string,
  columnMap: LoteColumnMap,
) {
  return apiUpload<DryRunResult>(
    "/lotes/contas/dry-run",
    buildForm(file, encoding, columnMap),
  );
}

export function commitContas(
  file: File,
  encoding: string,
  columnMap: LoteColumnMap,
) {
  return apiUpload<CommitResult>(
    "/lotes/contas/commit",
    buildForm(file, encoding, columnMap),
  );
}

export function dryRunInscricoes(
  file: File,
  encoding: string,
  columnMap: LoteColumnMap,
) {
  return apiUpload<DryRunResult>(
    "/lotes/inscricoes/dry-run",
    buildForm(file, encoding, columnMap),
  );
}

export function commitInscricoes(
  file: File,
  encoding: string,
  columnMap: LoteColumnMap,
) {
  return apiUpload<CommitResult>(
    "/lotes/inscricoes/commit",
    buildForm(file, encoding, columnMap),
  );
}

export type DashboardInsights = {
  filtros: Record<string, string | number | null | undefined>;
  cards: {
    ofertas: number;
    vagas: number;
    inscritos: number;
    convocados: number;
    matriculados: number;
    vagas_ociosas: number;
    taxa_ocupacao: number;
    taxa_conversao: number;
  };
  byCampus: Array<{
    id_campus: number;
    campus: string;
    vagas: number;
    inscritos: number;
    convocados: number;
    matriculados: number;
  }>;
  acVsCotas: {
    ac: { inscritos: number; convocados: number; matriculados: number };
    cotas: { inscritos: number; convocados: number; matriculados: number };
  };
  table: Array<{
    id_oferta: number;
    edital: string;
    campus: string;
    curso: string;
    turno: string;
    vagas: number;
    inscritos: number;
    convocados: number;
    matriculados: number;
    vagas_ociosas: number;
  }>;
  alerts: Array<{ nivel: string; mensagem: string; id_oferta?: number }>;
};

export function getDashboardInsights(params: Record<string, string>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) qs.set(k, v);
  }
  const q = qs.toString();
  return apiFetch<DashboardInsights>(
    `/dashboard/insights${q ? `?${q}` : ""}`,
  );
}

export async function downloadDashboardExport(params: Record<string, string>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) qs.set(k, v);
  }
  const q = qs.toString();
  const blob = await apiFetchBlob(`/dashboard/export.csv${q ? `?${q}` : ""}`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function updateUsuarioAtivo(id: number, ativo: boolean) {
  return apiFetch(`/user/${id}/ativo`, {
    method: "PATCH",
    body: JSON.stringify({ ativo }),
  });
}

export function gerarChamada(body: {
  id_oferta: number;
  observacao?: string;
  fallback_ac_para_rv?: boolean;
}) {
  return apiFetch("/chamadas/gerar", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function listChamadas(idOferta: number) {
  return apiFetch<unknown[]>(`/chamadas?id_oferta=${idOferta}`);
}

export function getChamada(id: number) {
  return apiFetch<{
    id: number;
    numero: number;
    itens?: Array<{
      lista: string;
      tipo_cota: string;
      posicao: number;
      realocado_para_ac?: boolean;
      candidatura?: {
        id: number;
        usuario?: { nome_completo?: string; CPF?: string };
      };
    }>;
  }>(`/chamadas/${id}`);
}

export function importarMatriculados(id: number, cpfs: string[]) {
  return apiFetch(`/chamadas/${id}/matriculados`, {
    method: "POST",
    body: JSON.stringify({ cpfs }),
  });
}
