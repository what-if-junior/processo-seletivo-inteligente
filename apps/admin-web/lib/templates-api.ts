import { apiFetch } from "./api";

export type TemplateBiblioteca = {
  id: number;
  titulo: string;
  corpo: string;
  canal?: string | null;
  tipo_uso?: string | null;
  ativo: boolean;
};

export type TemplateEdital = {
  id: number;
  id_template_origem?: number | null;
  id_edital?: number | null;
  titulo: string;
  corpo: string;
  canal?: string | null;
  tipo_uso?: string | null;
};

export function listBiblioteca(ativosOnly = false): Promise<TemplateBiblioteca[]> {
  return apiFetch<TemplateBiblioteca[]>(
    `/templates/biblioteca${ativosOnly ? "?ativos=1" : ""}`,
  );
}

export function createBiblioteca(
  body: Partial<TemplateBiblioteca> & { titulo: string; corpo: string },
): Promise<TemplateBiblioteca> {
  return apiFetch("/templates/biblioteca", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateBiblioteca(
  id: number,
  body: Partial<TemplateBiblioteca>,
): Promise<TemplateBiblioteca> {
  return apiFetch(`/templates/biblioteca/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteBiblioteca(id: number): Promise<unknown> {
  return apiFetch(`/templates/biblioteca/${id}`, { method: "DELETE" });
}

export function listTemplatesEdital(
  editalId: number,
  tipoUso?: string,
): Promise<TemplateEdital[]> {
  const qs = tipoUso ? `?tipo_uso=${encodeURIComponent(tipoUso)}` : "";
  return apiFetch(`/editais/${editalId}/templates${qs}`);
}

export function copiarTemplateEdital(
  editalId: number,
  id_template_biblioteca: number,
): Promise<TemplateEdital> {
  return apiFetch(`/editais/${editalId}/templates/copiar`, {
    method: "POST",
    body: JSON.stringify({ id_template_biblioteca }),
  });
}

export function updateTemplateEdital(
  editalId: number,
  id: number,
  body: Partial<TemplateEdital>,
): Promise<TemplateEdital> {
  return apiFetch(`/editais/${editalId}/templates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteTemplateEdital(
  editalId: number,
  id: number,
): Promise<void> {
  return apiFetch(`/editais/${editalId}/templates/${id}`, {
    method: "DELETE",
  });
}
