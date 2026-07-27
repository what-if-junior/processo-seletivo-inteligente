import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoVagaCandidatura } from '@repo/types';

export class UpdateCotaDto {
  @ApiPropertyOptional({
    enum: TipoVagaCandidatura,
    example: TipoVagaCandidatura.PPI,
  })
  tipo_cota?: string;

  @ApiPropertyOptional({ example: 5, nullable: true })
  vagas?: number | null;

  @ApiPropertyOptional({ example: 12.5, nullable: true })
  percentual?: number | null;
}
