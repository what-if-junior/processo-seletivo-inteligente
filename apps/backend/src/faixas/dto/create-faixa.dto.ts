import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFaixaDto {
  @ApiProperty({ example: 'Até 1 SM', description: 'Rótulo exibido ao candidato' })
  rotulo: string;

  @ApiPropertyOptional({
    example: 0,
    nullable: true,
    description: 'Multiplicador mínimo do SM (inclusive)',
  })
  multiplicador_min?: number | null;

  @ApiPropertyOptional({
    example: 1,
    nullable: true,
    description: 'Multiplicador máximo do SM (inclusive)',
  })
  multiplicador_max?: number | null;

  @ApiPropertyOptional({
    example: 1,
    description: 'Ordem; se omitido, append ao final',
  })
  ordem?: number;

  @ApiPropertyOptional({ default: true })
  ativo?: boolean;
}
