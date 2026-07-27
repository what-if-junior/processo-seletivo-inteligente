import { ApiProperty } from '@nestjs/swagger';
import { TurnoOferta } from '@repo/types';

export class CreateOfertaDto {
  @ApiProperty({ example: 1, description: 'Edital pai' })
  id_edital: number;

  @ApiProperty({ example: 1 })
  id_curso: number;

  @ApiProperty({ example: 10 })
  id_campus: number;

  @ApiProperty({ enum: TurnoOferta, example: TurnoOferta.NOTURNO })
  turno: TurnoOferta;

  @ApiProperty({
    example: 40,
    description: 'Total de vagas da oferta (referência para cotas)',
  })
  vagas_totais: number;
}
