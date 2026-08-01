/**
 * W22 — vagas remanescentes → AC (REQ-3.1).
 *
 * Depois de cada chamada, as vagas de cota que não foram preenchidas revertem
 * sempre para a ampla concorrência (sem depender da flag `fallback_ac_para_rv`,
 * que é independente e cobre REQ-3.2/3.3).
 */

export const COTA_AC = 'AC';

/** Vagas oferecidas numa chamada, por tipo de cota. */
export type SeatPlan = {
  tipo_cota: string;
  vagas: number;
};

/** Resultado de uma chamada: quantas das vagas ofertadas foram ocupadas. */
export type SeatOutcome = SeatPlan & {
  preenchidas: number;
};

export type Remanescente = {
  tipo_cota: string;
  remanescentes: number;
};

type DistribuicaoInput = {
  tipo_cota: string;
  vagas?: number | null;
  percentual?: string | number | null;
};

function toInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

/**
 * Converte a `DistribuicaoCotas` da oferta no plano de vagas da 1ª chamada.
 * Aceita o modo absoluto (`vagas`) e o percentual; o resto que não fecha o
 * total da oferta fica na AC.
 */
export function distribuicaoToSeatPlan(
  distribuicao: DistribuicaoInput[],
  vagasTotais: number,
): SeatPlan[] {
  const total = Math.max(0, toInt(vagasTotais));
  if (total === 0) return [];

  const plano = new Map<string, number>();
  for (const linha of distribuicao ?? []) {
    const cota = (linha.tipo_cota || '').trim().toUpperCase();
    if (!cota) continue;

    let vagas = toInt(linha.vagas);
    if (!vagas && linha.percentual != null) {
      vagas = Math.round((Number(linha.percentual) / 100) * total);
    }
    if (vagas <= 0) continue;
    plano.set(cota, (plano.get(cota) ?? 0) + vagas);
  }

  const reservado = [...plano.entries()]
    .filter(([cota]) => cota !== COTA_AC)
    .reduce((soma, [, vagas]) => soma + vagas, 0);

  // A AC absorve o remanescente do planeamento; nunca ultrapassa vagas_totais.
  const ac = Math.max(0, total - Math.min(reservado, total));
  if (ac > 0) plano.set(COTA_AC, ac);
  else plano.delete(COTA_AC);

  return [...plano.entries()]
    .map(([tipo_cota, vagas]) => ({ tipo_cota, vagas }))
    .filter((linha) => linha.vagas > 0)
    .sort(sortAcPrimeiro);
}

function sortAcPrimeiro(a: SeatPlan, b: SeatPlan): number {
  if (a.tipo_cota === COTA_AC) return -1;
  if (b.tipo_cota === COTA_AC) return 1;
  return a.tipo_cota.localeCompare(b.tipo_cota);
}

/** Vagas ociosas de cada cota após a chamada. */
export function computeRemanescentes(outcomes: SeatOutcome[]): Remanescente[] {
  return (outcomes ?? []).map((outcome) => ({
    tipo_cota: outcome.tipo_cota,
    remanescentes: Math.max(
      0,
      toInt(outcome.vagas) - toInt(outcome.preenchidas),
    ),
  }));
}

export function totalRemanescentes(outcomes: SeatOutcome[]): number {
  return computeRemanescentes(outcomes).reduce(
    (soma, linha) => soma + linha.remanescentes,
    0,
  );
}

/**
 * REQ-3.1 CA3 — plano da chamada seguinte: tudo o que sobrou (AC e cotas)
 * volta como ampla concorrência, disputado pela ordem classificatória geral.
 */
export function planoProximaChamada(outcomes: SeatOutcome[]): SeatPlan[] {
  const sobra = totalRemanescentes(outcomes);
  return sobra > 0 ? [{ tipo_cota: COTA_AC, vagas: sobra }] : [];
}

export function totalVagas(plano: SeatPlan[]): number {
  return (plano ?? []).reduce((soma, linha) => soma + toInt(linha.vagas), 0);
}
