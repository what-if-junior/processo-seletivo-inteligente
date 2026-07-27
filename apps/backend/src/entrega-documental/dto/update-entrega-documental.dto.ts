import { PartialType } from '@nestjs/swagger';
import { CreateEntregaDocumentalDto } from './create-entrega-documental.dto';

/** Patch may change modo/fields and optional vínculo FKs. */
export class UpdateEntregaDocumentalDto extends PartialType(
  CreateEntregaDocumentalDto,
) {}
