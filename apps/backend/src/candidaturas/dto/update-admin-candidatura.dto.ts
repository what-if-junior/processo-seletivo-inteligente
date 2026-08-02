import { ApiPropertyOptional } from '@nestjs/swagger';
import { StatusCandidatura } from '@repo/types';

export class UpdateAdminCandidaturaDto {
  @ApiPropertyOptional({ enum: StatusCandidatura })
  status?: StatusCandidatura;

  @ApiPropertyOptional({
    description: 'Observações administrativas da homologação',
  })
  observacoes_admin?: string;
}
