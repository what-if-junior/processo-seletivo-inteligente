import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateEditalDto } from './create-edital.dto';

export class UpdateEditalDto extends PartialType(CreateEditalDto) {
  @ApiPropertyOptional({
    description:
      'W31: se true, notifica coorte ativa sobre alteração do processo/publicação',
    default: false,
  })
  notificar_candidatos?: boolean;
}
