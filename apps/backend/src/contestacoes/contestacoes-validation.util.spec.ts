import { BadRequestException } from '@nestjs/common';
import { StatusContestacao } from '@repo/types';
import {
  assertAnexoContestacao,
  assertStatusTransition,
  ERR_ANEXO_INVALIDO,
  ERR_STATUS_TRANSICAO_INVALIDA,
} from './contestacoes-validation.util';

describe('contestacoes-validation.util', () => {
  it('status transition matrix', () => {
    expect(() =>
      assertStatusTransition(
        StatusContestacao.ENVIADA,
        StatusContestacao.EM_ANALISE,
      ),
    ).not.toThrow();
    expect(() =>
      assertStatusTransition(
        StatusContestacao.ENVIADA,
        StatusContestacao.DEFERIDA,
      ),
    ).not.toThrow();
    expect(() =>
      assertStatusTransition(
        StatusContestacao.EM_ANALISE,
        StatusContestacao.INDEFERIDA,
      ),
    ).not.toThrow();
    try {
      assertStatusTransition(
        StatusContestacao.DEFERIDA,
        StatusContestacao.ENVIADA,
      );
      fail('expected BadRequestException');
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      expect((e as BadRequestException).getResponse()).toMatchObject({
        code: ERR_STATUS_TRANSICAO_INVALIDA,
      });
    }
  });

  it('rejects oversize / bad MIME anexo', () => {
    const big = Buffer.alloc(5 * 1024 * 1024 + 1);
    try {
      assertAnexoContestacao(big, 'x.pdf', 'application/pdf');
      fail('expected BadRequestException');
    } catch (e) {
      expect((e as BadRequestException).getResponse()).toMatchObject({
        code: ERR_ANEXO_INVALIDO,
      });
    }
    try {
      assertAnexoContestacao(Buffer.from('x'), 'x.exe', 'application/x-msdownload');
      fail('expected BadRequestException');
    } catch (e) {
      expect((e as BadRequestException).getResponse()).toMatchObject({
        code: ERR_ANEXO_INVALIDO,
      });
    }
  });

  it('accepts valid PDF anexo', () => {
    const r = assertAnexoContestacao(
      Buffer.from('%PDF'),
      'doc.pdf',
      'application/pdf',
    );
    expect(r?.mime).toBe('application/pdf');
  });
});
