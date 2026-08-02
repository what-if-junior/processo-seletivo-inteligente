import { ForbiddenException } from '@nestjs/common';
import { TipoContestacao } from '@repo/types';
import { isEtapaEfetivamenteAberta } from '../cronograma/cronograma-validation.util';

export const ERR_ETAPA_CONTESTACAO_FECHADA = 'ETAPA_CONTESTACAO_FECHADA';

export type ContestacaoEtapaLike = {
  id: number;
  elegivel_impugnacao?: boolean | null;
  elegivel_recurso?: boolean | null;
  template_instrucao_id?: number | null;
  data_inicio: Date | string;
  data_fim: Date | string;
  override?: string;
};

export type ContestacaoElegibilidade = {
  impugnacao: boolean;
  recurso: boolean;
  etapa_id: number | null;
  template_instrucao_id: number | null;
};

function flagForTipo(
  etapa: ContestacaoEtapaLike,
  tipo: TipoContestacao,
): boolean {
  if (tipo === TipoContestacao.IMPUGNACAO) {
    return Boolean(etapa.elegivel_impugnacao);
  }
  // RECURSO + JUSTIFICATIVA share elegivel_recurso
  return Boolean(etapa.elegivel_recurso);
}

/** First open etapa that matches the contestação tipo flag. */
export function findEtapaContestacaoAberta(
  etapas: ContestacaoEtapaLike[],
  tipo: TipoContestacao,
  now: Date = new Date(),
): ContestacaoEtapaLike | null {
  for (const etapa of etapas) {
    if (!flagForTipo(etapa, tipo)) continue;
    if (!isEtapaEfetivamenteAberta(etapa, now)) continue;
    return etapa;
  }
  return null;
}

export function assertJanelaContestacaoAberta(
  etapas: ContestacaoEtapaLike[],
  tipo: TipoContestacao,
  now: Date = new Date(),
): ContestacaoEtapaLike {
  const etapa = findEtapaContestacaoAberta(etapas, tipo, now);
  if (!etapa) {
    throw new ForbiddenException({
      code: ERR_ETAPA_CONTESTACAO_FECHADA,
      message:
        'Etapa de contestação fechada ou não elegível para este tipo',
    });
  }
  return etapa;
}

export function computeElegibilidade(
  etapas: ContestacaoEtapaLike[],
  now: Date = new Date(),
): ContestacaoElegibilidade {
  const etapaImp = findEtapaContestacaoAberta(
    etapas,
    TipoContestacao.IMPUGNACAO,
    now,
  );
  const etapaRec = findEtapaContestacaoAberta(
    etapas,
    TipoContestacao.RECURSO,
    now,
  );
  const preferred = etapaImp ?? etapaRec;
  return {
    impugnacao: Boolean(etapaImp),
    recurso: Boolean(etapaRec),
    etapa_id: preferred?.id ?? null,
    template_instrucao_id: preferred?.template_instrucao_id ?? null,
  };
}
