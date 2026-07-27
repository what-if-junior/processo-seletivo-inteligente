import { ApiProperty } from '@nestjs/swagger';
import { CotaItemDto } from './cota-item.dto';

export class ReplaceCotasDto {
  @ApiProperty({
    type: [CotaItemDto],
    description:
      'Substitui a distribuição completa da oferta. Warning (não 4xx) se a soma não fechar vagas_totais.',
    example: [
      { tipo_cota: 'AC', vagas: 28 },
      { tipo_cota: 'PPI', vagas: 5 },
      { tipo_cota: 'PCD', percentual: 5 },
    ],
  })
  cotas: CotaItemDto[];
}
