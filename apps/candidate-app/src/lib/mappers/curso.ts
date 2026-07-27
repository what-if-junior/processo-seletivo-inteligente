import type { Cursos } from "@repo/types";
import type { EditalCard, EditalCardStatus, EditalCardTipo } from "./types";

function parseDateOnly(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function formatPrazoBr(isoDate: string): string {
  const d = parseDateOnly(isoDate);
  if (!d) return isoDate;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Optional inscription window (lives on Editais/cronograma, not slim Cursos). */
export type InscricaoWindow = {
  data_inicio_inscricao?: string | null;
  data_fim_inscricao?: string | null;
};

/** Derive aberto/encerrado from inscription window when present; else aberto. */
export function cursoInscricaoStatus(
  window: InscricaoWindow,
  now: Date = new Date(),
): EditalCardStatus {
  const startRaw = window.data_inicio_inscricao;
  const endRaw = window.data_fim_inscricao;
  if (!startRaw || !endRaw) return "aberto";
  const start = parseDateOnly(startRaw);
  const end = parseDateOnly(endRaw);
  if (!start || !end) return "encerrado";
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (today < start || today > end) return "encerrado";
  return "aberto";
}

/**
 * Heuristic: area_conhecimento / nome → Técnico | Superior | Médio.
 * Falls back to Técnico when unknown (keeps filter chips usable).
 */
export function inferCursoTipo(
  curso: Pick<Cursos, "nome" | "area_conhecimento">,
): EditalCardTipo {
  const blob = `${curso.area_conhecimento ?? ""} ${curso.nome}`.toLowerCase();
  if (
    /superior|bacharel|licenciat|tecnolog|gradua/.test(blob) ||
    /\bsisu\b/.test(blob)
  ) {
    return "Superior";
  }
  if (/ensino\s*m[eé]dio|\bm[eé]dio\b/.test(blob) && !/t[eé]cnico/.test(blob)) {
    return "Médio";
  }
  if (/t[eé]cnico/.test(blob)) return "Técnico";
  return "Técnico";
}

/**
 * Maps slim W1 `Cursos` → EditalCard.
 * Campus/vagas/prazo live on Ofertas/Editais — placeholders until PWA remaps to ofertas.
 */
export function cursoToEditalCard(
  curso: Cursos,
  now?: Date,
  window: InscricaoWindow = {},
): EditalCard {
  const status = cursoInscricaoStatus(window, now);
  const end = window.data_fim_inscricao;
  return {
    id: String(curso.id),
    titulo: curso.nome,
    sub: curso.eixo_tecnologico ?? curso.requisito_escolaridade ?? "—",
    campus: "—",
    vagas: 0,
    prazo: status === "encerrado" ? "Encerrado" : end ? formatPrazoBr(end) : "—",
    status,
    tipo: inferCursoTipo(curso),
  };
}
