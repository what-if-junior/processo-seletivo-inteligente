import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatusDocumento } from '@repo/types';

export class DecidirDocumentoDto {
  @ApiProperty({ enum: [StatusDocumento.APROVADO, StatusDocumento.REPROVADO] })
  status: StatusDocumento.APROVADO | StatusDocumento.REPROVADO;

  @ApiPropertyOptional({
    description: 'ID do motivo de catálogo (obrigatório se rejeitar)',
  })
  id_motivo?: number;

  @ApiPropertyOptional({
    description: 'Texto livre opcional (obrigatório se motivo exige)',
  })
  motivo_livre?: string;

  @ApiPropertyOptional({ description: 'Gestor que decide (opcional no MVP)' })
  id_gestor?: number;
}

export class DecidirLoteDto {
  @ApiProperty({ type: [Number] })
  ids: number[];

  @ApiProperty({ enum: [StatusDocumento.APROVADO, StatusDocumento.REPROVADO] })
  status: StatusDocumento.APROVADO | StatusDocumento.REPROVADO;

  @ApiPropertyOptional()
  id_motivo?: number;

  @ApiPropertyOptional()
  motivo_livre?: string;

  @ApiPropertyOptional()
  id_gestor?: number;
}
