import { BadRequestException } from '@nestjs/common';
import {
  BACKEND_UPLOAD_MAX_BYTES,
  CampoFormularioTipo,
  FaseDocumento,
} from '@repo/types';
import {
  assertCampoTipo,
  assertFaseDocumento,
  assertNomeNonEmpty,
  assertTamanhoMaxBytes,
  buildCatalogueChangeWarning,
  normalizeFormatos,
} from './tipos-documento-validation.util';

describe('tipos-documento-validation.util', () => {
  it('asserts fase and campo tipo', () => {
    expect(assertFaseDocumento(FaseDocumento.INSCRICAO)).toBe(
      FaseDocumento.INSCRICAO,
    );
    expect(assertCampoTipo(CampoFormularioTipo.DOCUMENTO)).toBe(
      CampoFormularioTipo.DOCUMENTO,
    );
    expect(() => assertFaseDocumento('X')).toThrow(BadRequestException);
    expect(() => assertCampoTipo('X')).toThrow(BadRequestException);
  });

  it('enforces tamanho_max_bytes ceiling', () => {
    expect(assertTamanhoMaxBytes(1024)).toBe(1024);
    expect(() => assertTamanhoMaxBytes(0)).toThrow(BadRequestException);
    expect(() => assertTamanhoMaxBytes(BACKEND_UPLOAD_MAX_BYTES + 1)).toThrow(
      BadRequestException,
    );
  });

  it('normalizes formatos', () => {
    expect(normalizeFormatos(undefined)).toEqual(['pdf']);
    expect(normalizeFormatos(['PDF', ' Jpg '])).toEqual(['pdf', 'jpg']);
    expect(() => normalizeFormatos(['', ' '])).toThrow(BadRequestException);
  });

  it('requires non-empty nome', () => {
    expect(assertNomeNonEmpty('  RG  ')).toBe('RG');
    expect(() => assertNomeNonEmpty('  ')).toThrow(BadRequestException);
  });

  it('builds catalogue warning only when inscriptions exist', () => {
    expect(buildCatalogueChangeWarning(0)).toEqual([]);
    const warnings = buildCatalogueChangeWarning(3);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].code).toBe('CATALOGUE_CHANGE_WITH_INSCRICOES');
    expect(warnings[0].inscricoes_count).toBe(3);
  });
});
