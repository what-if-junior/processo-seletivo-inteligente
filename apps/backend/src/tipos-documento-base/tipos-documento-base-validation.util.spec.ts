import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  assertDeleteAllowed,
  assertNomeNonEmpty,
  resolveInheritIds,
} from './tipos-documento-base-validation.util';

describe('tipos-documento-base-validation.util', () => {
  it('assertDeleteAllowed throws Conflict when linked', () => {
    expect(() => assertDeleteAllowed(2, 5)).toThrow(ConflictException);
    try {
      assertDeleteAllowed(2, 5);
    } catch (e) {
      const err = e as ConflictException;
      expect(err.getResponse()).toMatchObject({
        code: 'TIPO_BASE_VINCULADO',
        vinculados_count: 2,
      });
    }
  });

  it('assertDeleteAllowed allows when zero links', () => {
    expect(() => assertDeleteAllowed(0, 1)).not.toThrow();
  });

  it('resolveInheritIds: omit → all active', () => {
    expect(resolveInheritIds(undefined, [1, 2, 3])).toEqual([1, 2, 3]);
    expect(resolveInheritIds(null, [1, 2])).toEqual([1, 2]);
  });

  it('resolveInheritIds: empty → none', () => {
    expect(resolveInheritIds([], [1, 2])).toEqual([]);
  });

  it('resolveInheritIds: subset ok; invalid rejected', () => {
    expect(resolveInheritIds([2], [1, 2, 3])).toEqual([2]);
    expect(() => resolveInheritIds([9], [1, 2])).toThrow(BadRequestException);
  });

  it('assertNomeNonEmpty trims', () => {
    expect(assertNomeNonEmpty('  RG  ')).toBe('RG');
    expect(() => assertNomeNonEmpty('  ')).toThrow(BadRequestException);
  });
});
