import { BadRequestException } from '@nestjs/common';
import {
  assertCotaItemValid,
  assertCotasBatchValid,
  buildCotasWarnings,
  effectiveSeatsForCota,
} from './cotas-validation.util';

describe('cotas-validation.util', () => {
  describe('assertCotaItemValid', () => {
    it('rejects when neither vagas nor percentual is set', () => {
      expect(() =>
        assertCotaItemValid({ tipo_cota: 'PPI' }),
      ).toThrow(BadRequestException);
      expect(() =>
        assertCotaItemValid({ tipo_cota: 'PPI' }),
      ).toThrow(/vagas ou percentual/);
    });

    it('accepts absolute or percentual', () => {
      expect(() =>
        assertCotaItemValid({ tipo_cota: 'AC', vagas: 10 }),
      ).not.toThrow();
      expect(() =>
        assertCotaItemValid({ tipo_cota: 'PPI', percentual: 25 }),
      ).not.toThrow();
    });

    it('rejects percentual outside 0–100', () => {
      expect(() =>
        assertCotaItemValid({ tipo_cota: 'AC', percentual: 101 }),
      ).toThrow(/0 e 100/);
    });
  });

  describe('assertCotasBatchValid', () => {
    it('rejects duplicate tipo_cota', () => {
      expect(() =>
        assertCotasBatchValid([
          { tipo_cota: 'AC', vagas: 10 },
          { tipo_cota: 'ac', vagas: 5 },
        ]),
      ).toThrow(/duplicado/);
    });
  });

  describe('buildCotasWarnings', () => {
    it('returns empty when absolute seats close', () => {
      const warnings = buildCotasWarnings(
        [
          { tipo_cota: 'AC', vagas: 28 },
          { tipo_cota: 'PPI', vagas: 12 },
        ],
        40,
      );
      expect(warnings).toEqual([]);
    });

    it('warns VAGAS_TOTAL_MISMATCH when absolute sum differs (soft)', () => {
      const warnings = buildCotasWarnings(
        [
          { tipo_cota: 'AC', vagas: 20 },
          { tipo_cota: 'PPI', vagas: 5 },
        ],
        40,
      );
      expect(warnings).toHaveLength(1);
      expect(warnings[0].code).toBe('VAGAS_TOTAL_MISMATCH');
      expect(warnings[0].soma_vagas_efetivas).toBe(25);
    });

    it('warns on pure-% when percent sum ≠ 100 and seats mismatch', () => {
      const warnings = buildCotasWarnings(
        [
          { tipo_cota: 'AC', percentual: 50 },
          { tipo_cota: 'PPI', percentual: 30 },
        ],
        40,
      );
      const codes = warnings.map((w) => w.code);
      expect(codes).toContain('PERCENTUAL_SUM_MISMATCH');
      // 50%+30% of 40 → 20+12 = 32 ≠ 40
      expect(codes).toContain('VAGAS_TOTAL_MISMATCH');
    });

    it('closes pure-% at 100% with matching rounded seats', () => {
      const warnings = buildCotasWarnings(
        [
          { tipo_cota: 'AC', percentual: 70 },
          { tipo_cota: 'PPI', percentual: 30 },
        ],
        40,
      );
      expect(warnings).toEqual([]);
      expect(effectiveSeatsForCota({ percentual: 70 }, 40)).toBe(28);
      expect(effectiveSeatsForCota({ percentual: 30 }, 40)).toBe(12);
    });
  });
});
