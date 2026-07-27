import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFaixaDto {
  @ApiPropertyOptional({ example: 'Até 1,5 SM' })
  rotulo?: string;

  @ApiPropertyOptional({ nullable: true, example: 0 })
  multiplicador_min?: number | null;

  @ApiPropertyOptional({ nullable: true, example: 1.5 })
  multiplicador_max?: number | null;

  @ApiPropertyOptional({ example: 2 })
  ordem?: number;

  @ApiPropertyOptional({
    description:
      'false = desativa (histórico preservado para respostas antigas / W17)',
  })
  ativo?: boolean;
}
