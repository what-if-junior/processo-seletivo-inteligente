import { PartialType } from '@nestjs/swagger';
import { CreateTipoDocumentoBaseDto } from './create-tipo-documento-base.dto';

export class UpdateTipoDocumentoBaseDto extends PartialType(
  CreateTipoDocumentoBaseDto,
) {}
