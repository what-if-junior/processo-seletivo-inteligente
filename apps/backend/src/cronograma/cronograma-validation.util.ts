import { BadRequestException } from '@nestjs/common';
import {
  EtapaStatusOverride,
  TipoEtapaCronograma,
} from '@repo/types';

export type CronogramaEtapaLike = {
  id?: number;
  tipo: TipoEtapaCronograma | string;
  data_inicio: Date | string;
  data_fim: Date | string;
  override?: EtapaStatusOverride | string;
};

export type CronogramaWarningCode = 'DATE_OVERLAP';

export type CronogramaWarning = {
  code: CronogramaWarningCode;
  message: string;
  etapa_ids: number[];
};

export function toDate(value: Date | string): Date {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException('data inválida');
  }
  return d;
}

/** Hard rule: data_fim >= data_inicio (REQ-1.2). */
export function assertDatasValidas(
  dataInicio: Date | string,
  dataFim: Date | string,
): { inicio: Date; fim: Date } {
  const inicio = toDate(dataInicio);
  const fim = toDate(dataFim);
  if (fim.getTime() < inicio.getTime()) {
    throw new BadRequestException('data_fim deve ser ≥ data_inicio');
  }
  return { inicio, fim };
}

/**
 * Soft warnings when date ranges overlap within the same edital.
 * Inclusive endpoints; never throws.
 */
export function buildDateOverlapWarnings(
  etapas: CronogramaEtapaLike[],
): CronogramaWarning[] {
  const withIds = etapas
    .map((e) => ({
      id: e.id ?? 0,
      inicio: toDate(e.data_inicio).getTime(),
      fim: toDate(e.data_fim).getTime(),
    }))
    .sort((a, b) => a.inicio - b.inicio || a.id - b.id);

  const warnings: CronogramaWarning[] = [];
  const seenPairs = new Set<string>();

  for (let i = 0; i < withIds.length; i++) {
    for (let j = i + 1; j < withIds.length; j++) {
      const a = withIds[i];
      const b = withIds[j];
      if (b.inicio > a.fim) break;
      // overlap: a.inicio <= b.fim && b.inicio <= a.fim (sorted so a.inicio <= b.inicio)
      if (b.inicio <= a.fim) {
        const pairKey = [a.id, b.id].sort((x, y) => x - y).join('-');
        if (seenPairs.has(pairKey)) continue;
        seenPairs.add(pairKey);
        warnings.push({
          code: 'DATE_OVERLAP',
          message: `Etapas ${a.id} e ${b.id} têm datas sobrepostas`,
          etapa_ids: [a.id, b.id].filter((id) => id > 0),
        });
      }
    }
  }

  return warnings;
}

/** Effective open state from dates + override (REQ-1.2 / 1.3 CA). */
export function isEtapaEfetivamenteAberta(
  etapa: Pick<CronogramaEtapaLike, 'data_inicio' | 'data_fim' | 'override'>,
  now: Date = new Date(),
): boolean {
  const override =
    (etapa.override as EtapaStatusOverride) ?? EtapaStatusOverride.AUTOMATICO;
  if (override === EtapaStatusOverride.BLOQUEADO_MANUALMENTE) return false;
  if (override === EtapaStatusOverride.FORCADO_ABERTO) return true;
  const inicio = toDate(etapa.data_inicio).getTime();
  const fim = toDate(etapa.data_fim).getTime();
  const t = now.getTime();
  return inicio <= t && t <= fim;
}

export type JanelaInscricaoEfetiva = {
  aberta: boolean;
  etapa: CronogramaEtapaLike | null;
};

/**
 * Effective Inscrição window for cancel/submit gates (W14 consumer).
 * Uses first INSCRICAO row by ordem/id if multiple.
 */
export function getJanelaInscricaoEfetiva(
  etapas: CronogramaEtapaLike[],
  now: Date = new Date(),
): JanelaInscricaoEfetiva {
  const inscricao = [...etapas]
    .filter((e) => e.tipo === TipoEtapaCronograma.INSCRICAO)
    .sort((a, b) => (a.id ?? 0) - (b.id ?? 0))[0];

  if (!inscricao) {
    return { aberta: false, etapa: null };
  }
  return {
    aberta: isEtapaEfetivamenteAberta(inscricao, now),
    etapa: inscricao,
  };
}

export const TIPO_ETAPA_DEFAULT_NOME: Record<TipoEtapaCronograma, string> = {
  [TipoEtapaCronograma.INSCRICAO]: 'Inscrição',
  [TipoEtapaCronograma.HOMOLOGACAO]: 'Homologação',
  [TipoEtapaCronograma.SORTEIO_ELETRONICO]: 'Sorteio Eletrônico',
  [TipoEtapaCronograma.RESULTADO_PRELIMINAR]: 'Resultado Preliminar',
  [TipoEtapaCronograma.RECURSO_E_IMPUGNACAO]: 'Recurso e Impugnação',
  [TipoEtapaCronograma.RESULTADO_FINAL]: 'Resultado Final',
  [TipoEtapaCronograma.MATRICULA]: 'Matrícula',
};
