import { BadRequestException } from '@nestjs/common';
import {
  BACKEND_UPLOAD_MAX_BYTES,
  CampoFormularioTipo,
  FaseDocumento,
} from '@repo/types';

export type TiposDocumentoWarningCode = 'CATALOGUE_CHANGE_WITH_INSCRICOES';

export type TiposDocumentoWarning = {
  code: TiposDocumentoWarningCode;
  message: string;
  inscricoes_count: number;
};

export function assertFaseDocumento(fase: string): FaseDocumento {
  if (!Object.values(FaseDocumento).includes(fase as FaseDocumento)) {
    throw new BadRequestException(`fase inválida: ${fase}`);
  }
  return fase as FaseDocumento;
}

export function assertCampoTipo(tipo: string): CampoFormularioTipo {
  if (!Object.values(CampoFormularioTipo).includes(tipo as CampoFormularioTipo)) {
    throw new BadRequestException(`tipo de campo inválido: ${tipo}`);
  }
  return tipo as CampoFormularioTipo;
}

export function assertTamanhoMaxBytes(
  value: number,
  label = 'tamanho_max_bytes',
): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new BadRequestException(`${label} deve ser inteiro > 0`);
  }
  if (value > BACKEND_UPLOAD_MAX_BYTES) {
    throw new BadRequestException(
      `${label} excede o limite do backend (${BACKEND_UPLOAD_MAX_BYTES} bytes)`,
    );
  }
  return value;
}

export function normalizeFormatos(formatos?: string[] | null): string[] {
  if (!formatos || formatos.length === 0) {
    return ['pdf'];
  }
  const cleaned = formatos
    .map((f) => f?.trim().toLowerCase())
    .filter((f): f is string => Boolean(f));
  if (cleaned.length === 0) {
    throw new BadRequestException('formatos deve listar ao menos uma extensão');
  }
  return cleaned;
}

export function assertNomeNonEmpty(nome: string, label = 'nome'): string {
  const trimmed = nome?.trim();
  if (!trimmed) {
    throw new BadRequestException(`${label} é obrigatório`);
  }
  return trimmed;
}

export function buildCatalogueChangeWarning(
  inscricoesCount: number,
): TiposDocumentoWarning[] {
  if (inscricoesCount <= 0) return [];
  return [
    {
      code: 'CATALOGUE_CHANGE_WITH_INSCRICOES',
      message:
        'Existem inscrições neste edital; alteração do catálogo de documentos é permitida, mas pode afetar candidatos já inscritos.',
      inscricoes_count: inscricoesCount,
    },
  ];
}
