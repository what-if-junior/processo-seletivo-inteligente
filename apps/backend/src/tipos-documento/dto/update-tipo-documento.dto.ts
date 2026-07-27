import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateTipoDocumentoDto } from './create-tipo-documento.dto';

export class UpdateTipoDocumentoDto extends PartialType(CreateTipoDocumentoDto) {
  @ApiPropertyOptional({ nullable: true })
  tipo_cota?: string | null;
}
