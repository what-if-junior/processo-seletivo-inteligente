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

/** Derive aberto/encerrado from inscription window (not a DB enum). */
export function cursoInscricaoStatus(
  curso: Pick<Cursos, "data_inicio_inscricao" | "data_fim_inscricao">,
  now: Date = new Date(),
): EditalCardStatus {
  const start = parseDateOnly(curso.data_inicio_inscricao);
  const end = parseDateOnly(curso.data_fim_inscricao);
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

export function cursoToEditalCard(curso: Cursos, now?: Date): EditalCard {
  const status = cursoInscricaoStatus(curso, now);
  return {
    id: String(curso.id),
    titulo: curso.nome,
    sub: curso.duracao_semestres,
    campus: curso.campus,
    vagas: curso.vagas_totais,
    prazo: status === "encerrado" ? "Encerrado" : formatPrazoBr(curso.data_fim_inscricao),
    status,
    tipo: inferCursoTipo(curso),
  };
}
