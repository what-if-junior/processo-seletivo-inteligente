import { BadRequestException } from '@nestjs/common';
import {
  assertMultiplicadores,
  assertRotulo,
  assertSalarioMinimoReferencia,
  buildFaixasWarnings,
  isRegraB,
} from './faixas-validation.util';

describe('faixas-validation.util', () => {
  describe('assertRotulo', () => {
    it('rejects empty / whitespace', () => {
      expect(() => assertRotulo('')).toThrow(BadRequestException);
      expect(() => assertRotulo('   ')).toThrow(BadRequestException);
      expect(() => assertRotulo(null)).toThrow(BadRequestException);
    });

    it('trims valid rótulo', () => {
      expect(assertRotulo('  Até 1 SM  ')).toBe('Até 1 SM');
    });
  });

  describe('assertMultiplicadores', () => {
    it('rejects min > max', () => {
      expect(() => assertMultiplicadores(2, 1)).toThrow(BadRequestException);
      expect(() => assertMultiplicadores(2, 1)).toThrow(/≤/);
    });

    it('allows null bounds and equal bounds', () => {
      expect(() => assertMultiplicadores(null, 1)).not.toThrow();
      expect(() => assertMultiplicadores(0, null)).not.toThrow();
      expect(() => assertMultiplicadores(1, 1)).not.toThrow();
    });
  });

  describe('assertSalarioMinimoReferencia', () => {
    it('rejects negative and NaN', () => {
      expect(() => assertSalarioMinimoReferencia(-1)).toThrow(BadRequestException);
      expect(() => assertSalarioMinimoReferencia(Number.NaN)).toThrow(
        BadRequestException,
      );
    });

    it('accepts zero and positive', () => {
      expect(assertSalarioMinimoReferencia(0)).toBe(0);
      expect(assertSalarioMinimoReferencia(1518)).toBe(1518);
    });
  });

  describe('Rule B', () => {
    it('is true / warns when no active faixas', () => {
      expect(isRegraB([])).toBe(true);
      expect(isRegraB([{ ativo: false }])).toBe(true);
      const warnings = buildFaixasWarnings([{ id: 1, ativo: false }]);
      expect(warnings).toHaveLength(1);
      expect(warnings[0].code).toBe('FAIXAS_ATIVAS_VAZIAS');
    });

    it('is false when at least one active', () => {
      expect(isRegraB([{ ativo: true }, { ativo: false }])).toBe(false);
      expect(buildFaixasWarnings([{ ativo: true }])).toEqual([]);
    });
  });
});
