import { TipoCarrossel } from '@repo/types';
import {
  assertScheduleValid,
  ERR_CARROSSEL_SCHEDULE_INVALIDO,
  isEditalAberto,
  isPubliclyVisible,
  isWithinSchedule,
} from './carrossel-visibility.util';

describe('carrossel-visibility.util', () => {
  const now = new Date('2026-08-02T12:00:00.000Z');

  it('null/null schedule is always visible', () => {
    expect(isWithinSchedule({ inicio_em: null, fim_em: null }, now)).toBe(true);
  });

  it('future inicio_em excludes', () => {
    expect(
      isWithinSchedule(
        { inicio_em: '2026-08-03T00:00:00.000Z', fim_em: null },
        now,
      ),
    ).toBe(false);
  });

  it('past fim_em excludes', () => {
    expect(
      isWithinSchedule(
        { inicio_em: null, fim_em: '2026-08-01T00:00:00.000Z' },
        now,
      ),
    ).toBe(false);
  });

  it('window containing now includes', () => {
    expect(
      isWithinSchedule(
        {
          inicio_em: '2026-08-01T00:00:00.000Z',
          fim_em: '2026-08-10T00:00:00.000Z',
        },
        now,
      ),
    ).toBe(true);
  });

  it('assertScheduleValid rejects fim < inicio', () => {
    expect(() =>
      assertScheduleValid({
        inicio_em: '2026-08-10T00:00:00.000Z',
        fim_em: '2026-08-01T00:00:00.000Z',
      }),
    ).toThrow(
      expect.objectContaining({
        response: expect.objectContaining({
          code: ERR_CARROSSEL_SCHEDULE_INVALIDO,
        }),
      }),
    );
  });

  it('isEditalAberto requires both flags', () => {
    expect(isEditalAberto({ publicado: true, inscricoes_abertas: true })).toBe(
      true,
    );
    expect(isEditalAberto({ publicado: true, inscricoes_abertas: false })).toBe(
      false,
    );
    expect(isEditalAberto({ publicado: false, inscricoes_abertas: true })).toBe(
      false,
    );
  });

  it('manual: ativo + schedule', () => {
    expect(
      isPubliclyVisible(
        {
          tipo: TipoCarrossel.MANUAL,
          ativo: true,
          inicio_em: null,
          fim_em: null,
        },
        now,
      ),
    ).toBe(true);
    expect(
      isPubliclyVisible(
        {
          tipo: TipoCarrossel.MANUAL,
          ativo: false,
          inicio_em: null,
          fim_em: null,
        },
        now,
      ),
    ).toBe(false);
  });

  it('auto: needs ativo + habilitado + edital aberto', () => {
    const base = {
      tipo: TipoCarrossel.AUTO_EDITAL,
      ativo: true,
      auto_edital_habilitado: true,
      edital_aberto: true,
      inicio_em: null,
      fim_em: null,
    };
    expect(isPubliclyVisible(base, now)).toBe(true);
    expect(
      isPubliclyVisible({ ...base, auto_edital_habilitado: false }, now),
    ).toBe(false);
    expect(isPubliclyVisible({ ...base, edital_aberto: false }, now)).toBe(
      false,
    );
  });
});
