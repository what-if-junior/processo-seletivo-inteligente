import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CampoFormularioTipo } from '@repo/types';

export class TipoDocumentoCampoItemDto {
  @ApiProperty({ enum: CampoFormularioTipo, example: CampoFormularioTipo.TEXTO })
  tipo: CampoFormularioTipo;

  @ApiProperty({ example: 'Número do documento' })
  rotulo: string;

  @ApiPropertyOptional({ default: false })
  obrigatorio?: boolean;

  @ApiPropertyOptional({
    example: 1,
    description: 'Ordem; se omitido, usa índice + 1',
  })
  ordem?: number;

  @ApiPropertyOptional({
    type: [String],
    nullable: true,
    description: 'Só relevante para tipo documento',
  })
  formatos?: string[] | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Só relevante para tipo documento; ≤ backend max',
  })
  tamanho_max_bytes?: number | null;
}

export class ReplaceTipoDocumentoCamposDto {
  @ApiProperty({ type: [TipoDocumentoCampoItemDto] })
  campos: TipoDocumentoCampoItemDto[];
}
