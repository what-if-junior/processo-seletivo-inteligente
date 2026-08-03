import { apiFetch } from "./api";

export type CarrosselPublicItem = {
  id: number;
  tipo: "manual" | "auto_edital" | string;
  rotulo: string | null;
  titulo: string;
  subtitulo: string | null;
  cta_texto: string | null;
  cta_link: string | null;
  imagem_url: string | null;
  icone: string | null;
  ordem: number;
  id_edital: number | null;
};

export type CarrosselCtaAction =
  | { kind: "filter_edital"; id_edital: number }
  | { kind: "external"; url: string }
  | { kind: "goto_processos" };

/**
 * Locked CTA rule (W32):
 * 1. id_edital → setFilterEditalId
 * 2. absolute http(s) cta_link → external
 * 3. else → goto processos
 */
export function resolveCarrosselCta(
  item: Pick<CarrosselPublicItem, "id_edital" | "cta_link">,
): CarrosselCtaAction {
  if (item.id_edital != null && Number.isFinite(Number(item.id_edital))) {
    return { kind: "filter_edital", id_edital: Number(item.id_edital) };
  }
  const link = (item.cta_link ?? "").trim();
  if (/^https?:\/\//i.test(link)) {
    return { kind: "external", url: link };
  }
  return { kind: "goto_processos" };
}

export function fetchCarrosselPublic(): Promise<CarrosselPublicItem[]> {
  return apiFetch<CarrosselPublicItem[]>("/carrossel");
}
