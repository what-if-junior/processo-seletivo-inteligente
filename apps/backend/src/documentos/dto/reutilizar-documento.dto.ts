import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FaseDocumento } from '@repo/types';

export class ReutilizarDocumentoDto {
  @ApiProperty({ description: 'Candidatura (inscrição) destino do snapshot' })
  id_candidatura: number;

  @ApiPropertyOptional({
    description: 'ID do TiposDocumento exigido no edital',
  })
  id_tipo_documento?: number;

  @ApiPropertyOptional({
    description: 'Nome do tipo (alternativa a id_tipo_documento)',
  })
  tipo?: string;

  @ApiPropertyOptional({
    description:
      'DocumentosConta explícito; se omitido, resolve por match id_tipo_base/nome',
  })
  id_documento_conta?: number;

  @ApiPropertyOptional({
    enum: FaseDocumento,
    description:
      'Must match the edital exigência fase when sent; server uses tipo.fase',
  })
  fase?: FaseDocumento | string;
}
