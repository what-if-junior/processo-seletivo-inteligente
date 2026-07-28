import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoVagaCandidatura } from '@repo/types';

/** MVP socio payload: faixa + nº pessoas (+ optional extras from admin field builder). */
export class SocioeconomicoDto {
  @ApiPropertyOptional({
    description: 'Faixa SM ativa; obrigatória quando há faixas ativas',
  })
  id_faixa?: number | null;

  @ApiPropertyOptional({ description: 'Número de pessoas na residência (≥ 1)' })
  numero_pessoas?: number | null;

  @ApiPropertyOptional({
    description:
      'Respostas extras do construtor admin (REQ-2.3 CA3); chaves livres',
    type: 'object',
    additionalProperties: true,
  })
  campos_extras?: Record<string, unknown> | null;
}

export class UpdateTipoVagaDto {
  @ApiPropertyOptional({ enum: TipoVagaCandidatura })
  tipo_vaga: TipoVagaCandidatura;

  @ApiPropertyOptional({ type: SocioeconomicoDto })
  socioeconomico?: SocioeconomicoDto;
}
