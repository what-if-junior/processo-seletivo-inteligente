import { ApiProperty } from '@nestjs/swagger';

/** Metadados de PDF do edital (binário omitido). Vigente = último inserido. */
export class EditalArquivoMetaDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  id_edital: number;

  @ApiProperty({ example: '2026-07-27T14:00:00.000Z' })
  criado_em: Date;

  @ApiProperty({
    example: true,
    description: 'true no PDF mais recente (último inserido = vigente)',
  })
  vigente: boolean;
}
