import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { FaseDocumento, StatusCandidatura, StatusDocumento } from '@repo/types';

/** Candidatura docs keep a stricter 5 MiB ceiling than account-base uploads. */
export const DOCUMENTO_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

export const DOCUMENTO_ALLOWED_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
]);

export const DOCUMENTO_ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
]);

export function assertDocumentoUpload(
  arquivo: Buffer | undefined,
  nomeArquivo: string,
  mime?: string | null,
): { mime: string } {
  if (!arquivo?.length) {
    throw new BadRequestException('arquivo é obrigatório');
  }
  if (arquivo.length > DOCUMENTO_UPLOAD_MAX_BYTES) {
    throw new BadRequestException(
      `arquivo excede ${DOCUMENTO_UPLOAD_MAX_BYTES} bytes (5MB)`,
    );
  }

  const lowerName = (nomeArquivo || '').toLowerCase();
  const ext = lowerName.includes('.')
    ? lowerName.slice(lowerName.lastIndexOf('.'))
    : '';
  const normalizedMime = (mime || '').toLowerCase().trim();

  const mimeOk =
    !normalizedMime ||
    DOCUMENTO_ALLOWED_MIMES.has(normalizedMime) ||
    normalizedMime === 'application/octet-stream';
  const extOk = !ext || DOCUMENTO_ALLOWED_EXTENSIONS.has(ext);

  if (!mimeOk || !extOk) {
    throw new BadRequestException(
      'formato inválido: use JPG, PNG ou PDF (máx. 5MB)',
    );
  }

  let resolved = normalizedMime;
  if (!resolved || resolved === 'application/octet-stream') {
    if (ext === '.pdf') resolved = 'application/pdf';
    else if (ext === '.png') resolved = 'image/png';
    else resolved = 'image/jpeg';
  }
  return { mime: resolved };
}

export function assertPodeSubstituir(status: string | StatusDocumento): void {
  if (status === StatusDocumento.APROVADO) {
    throw new ForbiddenException(
      'documento homologado não pode ser substituído',
    );
  }
}

/** Matrícula phase uploads only for approved / pre-selected / matriculated. */
export function assertFaseMatriculaPermitida(
  status: StatusCandidatura | string,
  fase: FaseDocumento | string,
): void {
  if (fase !== FaseDocumento.MATRICULA) return;
  const allowed = new Set<string>([
    StatusCandidatura.APROVADO,
    StatusCandidatura.PRE_SELECIONADO,
    StatusCandidatura.MATRICULADO,
  ]);
  if (!allowed.has(String(status))) {
    throw new ForbiddenException(
      'documentos de matrícula só para candidaturas aprovadas/pré-selecionadas',
    );
  }
}

/**
 * W28 may attach `sugestao_ia`, but status must only change via human decidir.
 * This helper documents the invariant for Jest.
 */
export function applySugestaoIaSemDecisao(input: {
  status_documento: StatusDocumento | string;
  sugestao_ia?: string | null;
}): { status_documento: StatusDocumento | string; sugestao_ia: string | null } {
  return {
    status_documento: input.status_documento,
    sugestao_ia: input.sugestao_ia ?? null,
  };
}
