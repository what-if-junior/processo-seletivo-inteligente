import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FaseDocumento } from '@repo/types';

export class CreateTipoDocumentoBaseDto {
  @ApiProperty({ example: 'Documento de identidade' })
  nome: string;

  @ApiPropertyOptional({ nullable: true })
  descricao?: string | null;

  @ApiPropertyOptional({ default: true })
  obrigatorio?: boolean;

  @ApiPropertyOptional({
    type: [String],
    example: ['pdf', 'jpg', 'png'],
    description: 'Extensões aceites; default [pdf]',
  })
  formatos?: string[];

  @ApiPropertyOptional({
    example: 5242880,
    description: 'Bytes; hard ceiling = BACKEND_UPLOAD_MAX_BYTES (15 MiB)',
  })
  tamanho_max_bytes?: number;

  @ApiPropertyOptional({
    enum: FaseDocumento,
    example: FaseDocumento.INSCRICAO,
    description: 'Default INSCRICAO',
  })
  fase?: FaseDocumento;

  @ApiPropertyOptional({
    example: 1,
    description: 'Ordem; se omitido, append ao final',
  })
  ordem?: number;

  @ApiPropertyOptional({ default: true })
  ativo?: boolean;
}
