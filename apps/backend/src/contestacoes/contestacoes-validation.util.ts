import { BadRequestException } from '@nestjs/common';
import { StatusContestacao } from '@repo/types';
import {
  assertDocumentoUpload,
  DOCUMENTO_UPLOAD_MAX_BYTES,
} from '../documentos/documentos-validation.util';

export const ERR_STATUS_TRANSICAO_INVALIDA = 'STATUS_TRANSICAO_INVALIDA';
export const ERR_ANEXO_INVALIDO = 'ANEXO_INVALIDO';
export const ERR_CANDIDATURA_INVALIDA = 'CANDIDATURA_INVALIDA';

export { DOCUMENTO_UPLOAD_MAX_BYTES };

const TERMINAL = new Set<string>([
  StatusContestacao.DEFERIDA,
  StatusContestacao.INDEFERIDA,
]);

/** enviada → em_analise → deferida|indeferida; also enviada → deferida|indeferida */
const ALLOWED: Record<string, Set<string>> = {
  [StatusContestacao.ENVIADA]: new Set([
    StatusContestacao.EM_ANALISE,
    StatusContestacao.DEFERIDA,
    StatusContestacao.INDEFERIDA,
  ]),
  [StatusContestacao.EM_ANALISE]: new Set([
    StatusContestacao.DEFERIDA,
    StatusContestacao.INDEFERIDA,
  ]),
  [StatusContestacao.DEFERIDA]: new Set(),
  [StatusContestacao.INDEFERIDA]: new Set(),
};

export function assertStatusTransition(
  from: StatusContestacao | string,
  to: StatusContestacao | string,
): void {
  if (from === to) return;
  if (TERMINAL.has(String(from))) {
    throw new BadRequestException({
      code: ERR_STATUS_TRANSICAO_INVALIDA,
      message: `status terminal ${from} não pode transicionar`,
    });
  }
  const allowed = ALLOWED[String(from)];
  if (!allowed?.has(String(to))) {
    throw new BadRequestException({
      code: ERR_STATUS_TRANSICAO_INVALIDA,
      message: `transição ${from} → ${to} inválida`,
    });
  }
}

export function assertAnexoContestacao(
  arquivo: Buffer | undefined,
  nomeArquivo: string,
  mime?: string | null,
): { mime: string } | null {
  if (!arquivo?.length) return null;
  try {
    return assertDocumentoUpload(arquivo, nomeArquivo, mime);
  } catch (e) {
    if (e instanceof BadRequestException) {
      throw new BadRequestException({
        code: ERR_ANEXO_INVALIDO,
        message:
          typeof e.getResponse() === 'string'
            ? e.getResponse()
            : (e.getResponse() as { message?: string }).message ||
              'anexo inválido',
      });
    }
    throw e;
  }
}

export function guessMimeFromNome(nome?: string | null): string {
  const lower = (nome || '').toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}
