import { TurnoOferta, type Oferta } from "@repo/types";
import {
  cursoInscricaoStatus,
  formatPrazoBr,
  inferCursoTipo,
  type InscricaoWindow,
} from "./curso";
import type { EditalCard } from "./types";

const TURNO_LABEL: Record<string, string> = {
  [TurnoOferta.MATUTINO]: "Matutino",
  [TurnoOferta.VESPERTINO]: "Vespertino",
  [TurnoOferta.NOTURNO]: "Noturno",
  [TurnoOferta.INTEGRAL]: "Integral",
};

export function formatTurnoLabel(turno?: string | null): string {
  if (!turno) return "—";
  return TURNO_LABEL[turno] ?? turno;
}

/**
 * Maps API `Oferta` (+ relations) → EditalCard with real `id_oferta` / `id_edital` (M-06).
 * Status prefers `edital.inscricoes_abertas`; optional inscription window if present on payload.
 */
export function ofertaToEditalCard(
  oferta: Oferta,
  now: Date = new Date(),
): EditalCard {
  const curso = oferta.curso;
  const edital = oferta.edital;
  const campus = oferta.campus;

  const window: InscricaoWindow = {
    data_inicio_inscricao: (
      edital as InscricaoWindow | undefined
    )?.data_inicio_inscricao,
    data_fim_inscricao: (
      edital as InscricaoWindow | undefined
    )?.data_fim_inscricao,
  };

  let status: EditalCard["status"] = "aberto";
  let prazo = "—";

  if (edital && edital.inscricoes_abertas === false) {
    status = "encerrado";
    prazo = "Encerrado";
  } else if (window.data_inicio_inscricao && window.data_fim_inscricao) {
    status = cursoInscricaoStatus(window, now);
    prazo =
      status === "encerrado"
        ? "Encerrado"
        : formatPrazoBr(window.data_fim_inscricao);
  } else if (edital?.inscricoes_abertas === true) {
    status = "aberto";
  }

  const titulo = curso?.nome ?? `Curso #${oferta.id_curso}`;
  const area = curso?.area_conhecimento ?? "—";

  return {
    id: String(oferta.id),
    id_oferta: oferta.id,
    id_edital: oferta.id_edital,
    id_campus: oferta.id_campus,
    titulo,
    editalLabel: edital?.numero_ano ?? `Edital #${oferta.id_edital}`,
    sub: curso?.eixo_tecnologico ?? curso?.requisito_escolaridade ?? "—",
    campus: campus?.nome ?? "—",
    turno: formatTurnoLabel(oferta.turno),
    area_conhecimento: area,
    vagas: oferta.vagas_totais,
    prazo,
    status,
    tipo: curso ? inferCursoTipo(curso) : "Técnico",
  };
}

export type EditalCardFilter = {
  tipo?: string;
  search?: string;
  id_edital?: number | null;
  id_campus?: number | null;
};

export function filterEditalCards(
  cards: EditalCard[],
  filter: EditalCardFilter = {},
): EditalCard[] {
  const tipo = filter.tipo && filter.tipo !== "Todos" ? filter.tipo : null;
  const q = filter.search?.trim().toLowerCase() ?? "";
  const idEdital = filter.id_edital ?? null;
  const idCampus = filter.id_campus ?? null;

  return cards.filter((c) => {
    if (tipo && c.tipo !== tipo) return false;
    if (idEdital != null && c.id_edital !== idEdital) return false;
    if (idCampus != null && c.id_campus !== idCampus) return false;
    if (q) {
      const blob = [
        c.titulo,
        c.sub,
        c.campus,
        c.area_conhecimento,
        c.editalLabel,
        c.turno,
      ]
        .join(" ")
        .toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });
}

export function uniqueEditaisFromCards(
  cards: EditalCard[],
): { id: number; label: string }[] {
  const map = new Map<number, string>();
  for (const c of cards) {
    if (c.id_edital == null) continue;
    if (!map.has(c.id_edital)) map.set(c.id_edital, c.editalLabel);
  }
  return [...map.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

export function uniqueCampusesFromCards(
  cards: EditalCard[],
): { id: number; label: string }[] {
  const map = new Map<number, string>();
  for (const c of cards) {
    if (c.id_campus == null) continue;
    if (!map.has(c.id_campus)) map.set(c.id_campus, c.campus);
  }
  return [...map.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}
