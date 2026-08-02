import { ForbiddenException } from '@nestjs/common';
import { EtapaStatusOverride, TipoContestacao } from '@repo/types';
import {
  assertJanelaContestacaoAberta,
  computeElegibilidade,
  ERR_ETAPA_CONTESTACAO_FECHADA,
  findEtapaContestacaoAberta,
} from './contestacoes-eligibility.util';

function etapa(partial: {
  id: number;
  elegivel_impugnacao?: boolean;
  elegivel_recurso?: boolean;
  override?: EtapaStatusOverride;
  daysAgoStart?: number;
  daysAheadEnd?: number;
  template_instrucao_id?: number | null;
}) {
  const now = Date.now();
  const start = new Date(now - (partial.daysAgoStart ?? 1) * 86400000);
  const end = new Date(now + (partial.daysAheadEnd ?? 1) * 86400000);
  return {
    id: partial.id,
    elegivel_impugnacao: partial.elegivel_impugnacao ?? false,
    elegivel_recurso: partial.elegivel_recurso ?? false,
    override: partial.override ?? EtapaStatusOverride.AUTOMATICO,
    data_inicio: start,
    data_fim: end,
    template_instrucao_id: partial.template_instrucao_id ?? null,
  };
}

describe('contestacoes-eligibility.util', () => {
  it('open flag + window → create OK', () => {
    const rows = [
      etapa({ id: 1, elegivel_impugnacao: true }),
      etapa({ id: 2, elegivel_recurso: true }),
    ];
    expect(
      findEtapaContestacaoAberta(rows, TipoContestacao.IMPUGNACAO)?.id,
    ).toBe(1);
    expect(
      findEtapaContestacaoAberta(rows, TipoContestacao.RECURSO)?.id,
    ).toBe(2);
    expect(
      findEtapaContestacaoAberta(rows, TipoContestacao.JUSTIFICATIVA)?.id,
    ).toBe(2);
  });

  it('closed dates → reject', () => {
    const rows = [
      etapa({
        id: 1,
        elegivel_impugnacao: true,
        daysAgoStart: 10,
        daysAheadEnd: -5,
      }),
    ];
    expect(
      findEtapaContestacaoAberta(rows, TipoContestacao.IMPUGNACAO),
    ).toBeNull();
    try {
      assertJanelaContestacaoAberta(rows, TipoContestacao.IMPUGNACAO);
      fail('expected ForbiddenException');
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenException);
      expect((e as ForbiddenException).getResponse()).toMatchObject({
        code: ERR_ETAPA_CONTESTACAO_FECHADA,
      });
    }
  });

  it('BLOQUEADO_MANUALMENTE → reject', () => {
    const rows = [
      etapa({
        id: 1,
        elegivel_recurso: true,
        override: EtapaStatusOverride.BLOQUEADO_MANUALMENTE,
      }),
    ];
    expect(
      findEtapaContestacaoAberta(rows, TipoContestacao.RECURSO),
    ).toBeNull();
  });

  it('computeElegibilidade returns flags + template id', () => {
    const rows = [
      etapa({
        id: 9,
        elegivel_impugnacao: true,
        template_instrucao_id: 42,
      }),
    ];
    expect(computeElegibilidade(rows)).toEqual({
      impugnacao: true,
      recurso: false,
      etapa_id: 9,
      template_instrucao_id: 42,
    });
  });
});
