import { BadRequestException } from '@nestjs/common';
import {
  EtapaStatusOverride,
  TipoEtapaCronograma,
} from '@repo/types';
import {
  assertDatasValidas,
  buildDateOverlapWarnings,
  getJanelaInscricaoEfetiva,
  isEtapaEfetivamenteAberta,
} from './cronograma-validation.util';

describe('cronograma-validation.util', () => {
  describe('assertDatasValidas', () => {
    it('accepts data_fim === data_inicio', () => {
      const { inicio, fim } = assertDatasValidas(
        '2026-01-01T00:00:00.000Z',
        '2026-01-01T00:00:00.000Z',
      );
      expect(inicio.getTime()).toBe(fim.getTime());
    });

    it('rejects data_fim < data_inicio', () => {
      expect(() =>
        assertDatasValidas('2026-02-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ).toThrow(BadRequestException);
    });
  });

  describe('buildDateOverlapWarnings', () => {
    it('returns empty when ranges are disjoint', () => {
      const warnings = buildDateOverlapWarnings([
        {
          id: 1,
          tipo: TipoEtapaCronograma.INSCRICAO,
          data_inicio: '2026-01-01T00:00:00.000Z',
          data_fim: '2026-01-10T00:00:00.000Z',
        },
        {
          id: 2,
          tipo: TipoEtapaCronograma.HOMOLOGACAO,
          data_inicio: '2026-01-11T00:00:00.000Z',
          data_fim: '2026-01-20T00:00:00.000Z',
        },
      ]);
      expect(warnings).toEqual([]);
    });

    it('warns on overlapping ranges without throwing', () => {
      const warnings = buildDateOverlapWarnings([
        {
          id: 1,
          tipo: TipoEtapaCronograma.INSCRICAO,
          data_inicio: '2026-01-01T00:00:00.000Z',
          data_fim: '2026-01-15T00:00:00.000Z',
        },
        {
          id: 2,
          tipo: TipoEtapaCronograma.HOMOLOGACAO,
          data_inicio: '2026-01-10T00:00:00.000Z',
          data_fim: '2026-01-20T00:00:00.000Z',
        },
      ]);
      expect(warnings).toHaveLength(1);
      expect(warnings[0].code).toBe('DATE_OVERLAP');
      expect(warnings[0].etapa_ids).toEqual([1, 2]);
    });
  });

  describe('isEtapaEfetivamenteAberta', () => {
    const now = new Date('2026-06-15T12:00:00.000Z');

    it('AUTOMATICO inside window → true', () => {
      expect(
        isEtapaEfetivamenteAberta(
          {
            data_inicio: '2026-06-01T00:00:00.000Z',
            data_fim: '2026-06-30T00:00:00.000Z',
            override: EtapaStatusOverride.AUTOMATICO,
          },
          now,
        ),
      ).toBe(true);
    });

    it('AUTOMATICO outside window → false', () => {
      expect(
        isEtapaEfetivamenteAberta(
          {
            data_inicio: '2026-01-01T00:00:00.000Z',
            data_fim: '2026-01-31T00:00:00.000Z',
            override: EtapaStatusOverride.AUTOMATICO,
          },
          now,
        ),
      ).toBe(false);
    });

    it('FORCADO_ABERTO → true even outside window', () => {
      expect(
        isEtapaEfetivamenteAberta(
          {
            data_inicio: '2026-01-01T00:00:00.000Z',
            data_fim: '2026-01-31T00:00:00.000Z',
            override: EtapaStatusOverride.FORCADO_ABERTO,
          },
          now,
        ),
      ).toBe(true);
    });

    it('BLOQUEADO_MANUALMENTE → false even inside window', () => {
      expect(
        isEtapaEfetivamenteAberta(
          {
            data_inicio: '2026-06-01T00:00:00.000Z',
            data_fim: '2026-06-30T00:00:00.000Z',
            override: EtapaStatusOverride.BLOQUEADO_MANUALMENTE,
          },
          now,
        ),
      ).toBe(false);
    });
  });

  describe('getJanelaInscricaoEfetiva', () => {
    const now = new Date('2026-06-15T12:00:00.000Z');

    it('returns aberta false when no INSCRICAO etapa', () => {
      expect(
        getJanelaInscricaoEfetiva(
          [
            {
              id: 1,
              tipo: TipoEtapaCronograma.MATRICULA,
              data_inicio: '2026-06-01T00:00:00.000Z',
              data_fim: '2026-06-30T00:00:00.000Z',
            },
          ],
          now,
        ),
      ).toEqual({ aberta: false, etapa: null });
    });

    it('uses INSCRICAO etapa for gate', () => {
      const result = getJanelaInscricaoEfetiva(
        [
          {
            id: 2,
            tipo: TipoEtapaCronograma.HOMOLOGACAO,
            data_inicio: '2026-07-01T00:00:00.000Z',
            data_fim: '2026-07-31T00:00:00.000Z',
          },
          {
            id: 1,
            tipo: TipoEtapaCronograma.INSCRICAO,
            data_inicio: '2026-06-01T00:00:00.000Z',
            data_fim: '2026-06-30T00:00:00.000Z',
            override: EtapaStatusOverride.AUTOMATICO,
          },
        ],
        now,
      );
      expect(result.aberta).toBe(true);
      expect(result.etapa?.id).toBe(1);
    });
  });
});
