import { BadRequestException } from '@nestjs/common';
import { TipoCarrossel } from '@repo/types';

export const ERR_CARROSSEL_TIPO_INVALIDO = 'CARROSSEL_TIPO_INVALIDO';
export const ERR_CARROSSEL_AUTO_DELETE_FORBIDDEN =
  'CARROSSEL_AUTO_DELETE_FORBIDDEN';
export const ERR_CARROSSEL_REORDER_INCOMPLETO = 'CARROSSEL_REORDER_INCOMPLETO';
export const ERR_EDITAL_NAO_ENCONTRADO = 'EDITAL_NAO_ENCONTRADO';
export const ERR_CARROSSEL_SCHEDULE_INVALIDO = 'CARROSSEL_SCHEDULE_INVALIDO';

export type CarrosselScheduleFields = {
  inicio_em?: Date | string | null;
  fim_em?: Date | string | null;
};

export type CarrosselVisibilityInput = {
  tipo: TipoCarrossel | string;
  ativo: boolean;
  auto_edital_habilitado?: boolean | null;
  inicio_em?: Date | string | null;
  fim_em?: Date | string | null;
  /** Required for auto_edital public visibility. */
  edital_aberto?: boolean;
};

function toDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Schedule-visible iff null bounds = always; else inicio_em <= now <= fim_em. */
export function isWithinSchedule(
  item: CarrosselScheduleFields,
  now: Date = new Date(),
): boolean {
  const inicio = toDate(item.inicio_em ?? null);
  const fim = toDate(item.fim_em ?? null);
  if (inicio && inicio.getTime() > now.getTime()) return false;
  if (fim && fim.getTime() < now.getTime()) return false;
  return true;
}

export function assertScheduleValid(item: CarrosselScheduleFields): void {
  const inicio = toDate(item.inicio_em ?? null);
  const fim = toDate(item.fim_em ?? null);
  if (inicio && fim && fim.getTime() < inicio.getTime()) {
    throw new BadRequestException({
      code: ERR_CARROSSEL_SCHEDULE_INVALIDO,
      message: 'fim_em deve ser ≥ inicio_em',
    });
  }
}

/** Edital aberto = publicado && inscricoes_abertas. */
export function isEditalAberto(edital: {
  publicado?: boolean | null;
  inscricoes_abertas?: boolean | null;
}): boolean {
  return edital.publicado === true && edital.inscricoes_abertas === true;
}

/**
 * Public feed predicate: schedule OK + (manual∧ativo | auto∧ativo∧habilitado∧edital aberto).
 */
export function isPubliclyVisible(
  item: CarrosselVisibilityInput,
  now: Date = new Date(),
): boolean {
  if (!isWithinSchedule(item, now)) return false;
  if (item.tipo === TipoCarrossel.MANUAL || item.tipo === 'manual') {
    return item.ativo === true;
  }
  if (item.tipo === TipoCarrossel.AUTO_EDITAL || item.tipo === 'auto_edital') {
    return (
      item.ativo === true &&
      item.auto_edital_habilitado === true &&
      item.edital_aberto === true
    );
  }
  return false;
}
