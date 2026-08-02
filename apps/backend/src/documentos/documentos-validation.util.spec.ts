import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { FaseDocumento, StatusCandidatura, StatusDocumento } from '@repo/types';
import {
  applySugestaoIaSemDecisao,
  assertDocumentoUpload,
  assertFaseMatriculaPermitida,
  assertPodeSubstituir,
  DOCUMENTO_UPLOAD_MAX_BYTES,
} from './documentos-validation.util';

describe('documentos-validation.util', () => {
  it('accepts pdf/jpeg/png within 5MB', () => {
    expect(
      assertDocumentoUpload(Buffer.from('%PDF'), 'doc.pdf', 'application/pdf')
        .mime,
    ).toBe('application/pdf');
    expect(
      assertDocumentoUpload(Buffer.from('img'), 'a.jpg', 'image/jpeg').mime,
    ).toBe('image/jpeg');
    expect(
      assertDocumentoUpload(Buffer.from('img'), 'a.png', 'image/png').mime,
    ).toBe('image/png');
  });

  it('rejects empty, oversized, or wrong format', () => {
    expect(() =>
      assertDocumentoUpload(Buffer.alloc(0), 'x.pdf', 'application/pdf'),
    ).toThrow(BadRequestException);
    expect(() =>
      assertDocumentoUpload(
        Buffer.alloc(DOCUMENTO_UPLOAD_MAX_BYTES + 1),
        'x.pdf',
        'application/pdf',
      ),
    ).toThrow(BadRequestException);
    expect(() =>
      assertDocumentoUpload(Buffer.from('x'), 'x.gif', 'image/gif'),
    ).toThrow(BadRequestException);
  });

  it('blocks replace when homologado', () => {
    expect(() => assertPodeSubstituir(StatusDocumento.APROVADO)).toThrow(
      ForbiddenException,
    );
    expect(() => assertPodeSubstituir(StatusDocumento.REPROVADO)).not.toThrow();
    expect(() => assertPodeSubstituir(StatusDocumento.EM_ANALISE)).not.toThrow();
  });

  it('gates matrícula docs by candidatura status', () => {
    expect(() =>
      assertFaseMatriculaPermitida(
        StatusCandidatura.INSCRICAO_RECEBIDA,
        FaseDocumento.MATRICULA,
      ),
    ).toThrow(ForbiddenException);
    expect(() =>
      assertFaseMatriculaPermitida(
        StatusCandidatura.APROVADO,
        FaseDocumento.MATRICULA,
      ),
    ).not.toThrow();
    expect(() =>
      assertFaseMatriculaPermitida(
        StatusCandidatura.INSCRICAO_RECEBIDA,
        FaseDocumento.INSCRICAO,
      ),
    ).not.toThrow();
  });

  it('never auto-rejects from IA suggestion alone (W27/W28 invariant)', () => {
    const out = applySugestaoIaSemDecisao({
      status_documento: StatusDocumento.EM_ANALISE,
      sugestao_ia: 'baixa confiança OCR — rejeitar?',
    });
    expect(out.status_documento).toBe(StatusDocumento.EM_ANALISE);
    expect(out.sugestao_ia).toMatch(/OCR/);
  });
});
