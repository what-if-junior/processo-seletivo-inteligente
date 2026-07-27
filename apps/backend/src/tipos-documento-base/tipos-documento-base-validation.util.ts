import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  BACKEND_UPLOAD_MAX_BYTES,
  FaseDocumento,
} from '@repo/types';

export function assertFaseDocumento(fase: string): FaseDocumento {
  if (!Object.values(FaseDocumento).includes(fase as FaseDocumento)) {
    throw new BadRequestException(`fase inválida: ${fase}`);
  }
  return fase as FaseDocumento;
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

/** REQ-1.5 CA2: remoção bloqueada enquanto houver vínculo em editais. */
export function assertDeleteAllowed(linkedCount: number, baseId: number): void {
  if (linkedCount > 0) {
    throw new ConflictException({
      code: 'TIPO_BASE_VINCULADO',
      message: `Tipo base ${baseId} não pode ser removido enquanto houver vínculo em editais`,
      vinculados_count: linkedCount,
    });
  }
}

/**
 * Resolve which base ids to inherit into a new edital.
 * - undefined/null → all active bases
 * - [] → inherit none (deselect all)
 * - [ids] → inherit only those (must exist and be active)
 */
export function resolveInheritIds(
  requested: number[] | null | undefined,
  activeIds: number[],
): number[] {
  if (requested === undefined || requested === null) {
    return [...activeIds];
  }
  if (!Array.isArray(requested)) {
    throw new BadRequestException('tipos_base_ids deve ser um array de ids');
  }
  const unique = [...new Set(requested.map((n) => Number(n)))];
  if (unique.some((n) => !Number.isInteger(n) || n <= 0)) {
    throw new BadRequestException('tipos_base_ids deve conter ids inteiros > 0');
  }
  const activeSet = new Set(activeIds);
  const missing = unique.filter((id) => !activeSet.has(id));
  if (missing.length > 0) {
    throw new BadRequestException(
      `tipos_base_ids inválidos ou inativos: ${missing.join(', ')}`,
    );
  }
  return unique;
}
