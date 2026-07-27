import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoVagaCandidatura } from '@repo/types';

export class CotaItemDto {
  @ApiProperty({
    enum: TipoVagaCandidatura,
    example: TipoVagaCandidatura.PPI,
    description: 'Código canónico da cota (AC, PPI, PCD, …)',
  })
  tipo_cota: string;

  @ApiPropertyOptional({
    example: 5,
    nullable: true,
    description: 'Vagas absolutas (modo absoluto). Opcional se percentual informado.',
  })
  vagas?: number | null;

  @ApiPropertyOptional({
    example: 12.5,
    nullable: true,
    description:
      'Percentual 0–100 da oferta (modo %). Opcional se vagas informado. Pode coexistir.',
  })
  percentual?: number | null;
}
