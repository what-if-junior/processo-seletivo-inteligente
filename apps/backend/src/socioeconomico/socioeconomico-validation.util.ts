import { BadRequestException } from '@nestjs/common';
import { TipoVagaCandidatura } from '@repo/types';
import type { SocioeconomicoDto } from './dto/socioeconomico.dto';

export const MSG_SOCIO_NOT_ALLOWED =
  'Formulário socioeconómico só é permitido para cota BAIXA_RENDA';
export const MSG_SOCIO_FAIXA_REQUIRED =
  'id_faixa é obrigatório quando o bloco socioeconómico está ativo';
export const MSG_SOCIO_FAIXA_INVALID =
  'Faixa SM inválida ou inativa';
export const MSG_SOCIO_NUMERO_PESSOAS =
  'numero_pessoas deve ser um inteiro ≥ 1 quando o bloco socioeconómico está ativo';

export function isBaixaRenda(tipoVaga: TipoVagaCandidatura | string): boolean {
  return tipoVaga === TipoVagaCandidatura.BAIXA_RENDA;
}

export function assertNumeroPessoas(value: number | null | undefined): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw new BadRequestException(MSG_SOCIO_NUMERO_PESSOAS);
  }
  return n;
}

/**
 * When faixas are active (not regra B), faixa + numero_pessoas are required.
 * When regra B, socio body is optional / ignored for hard validation.
 */
export function assertSocioPayloadForBaixaRenda(
  dto: SocioeconomicoDto | undefined | null,
  regraB: boolean,
): SocioeconomicoDto {
  if (regraB) {
    return dto ?? {};
  }
  if (dto == null) {
    throw new BadRequestException(MSG_SOCIO_FAIXA_REQUIRED);
  }
  if (dto.id_faixa == null || Number.isNaN(Number(dto.id_faixa))) {
    throw new BadRequestException(MSG_SOCIO_FAIXA_REQUIRED);
  }
  assertNumeroPessoas(dto.numero_pessoas);
  return dto;
}

export function assertSocioNotSentForOtherCota(
  tipoVaga: TipoVagaCandidatura,
  dto: SocioeconomicoDto | undefined | null,
): void {
  if (!isBaixaRenda(tipoVaga) && dto != null) {
    const hasData =
      dto.id_faixa != null ||
      dto.numero_pessoas != null ||
      (dto.campos_extras != null &&
        Object.keys(dto.campos_extras).length > 0);
    if (hasData) {
      throw new BadRequestException(MSG_SOCIO_NOT_ALLOWED);
    }
  }
}
