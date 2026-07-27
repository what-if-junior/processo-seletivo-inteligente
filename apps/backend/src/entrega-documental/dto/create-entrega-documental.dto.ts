import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModoEntrega, SubtipoEntregaOnline } from '@repo/types';

export class CreateEntregaDocumentalDto {
  @ApiProperty({ example: 10 })
  id_campus: number;

  @ApiProperty({ example: 1 })
  id_curso: number;

  @ApiProperty({
    example: 4,
    description: 'FK CronogramaEtapas do mesmo edital',
  })
  id_cronograma_etapa: number;

  @ApiProperty({ enum: ModoEntrega, example: ModoEntrega.PRESENCIAL })
  modo: ModoEntrega;

  @ApiPropertyOptional({
    example: 'Secretaria Acadêmica',
    description: 'Obrigatório se PRESENCIAL',
  })
  local_nome?: string | null;

  @ApiPropertyOptional({ description: 'Obrigatório se PRESENCIAL' })
  endereco?: string | null;

  @ApiPropertyOptional()
  horario?: string | null;

  @ApiPropertyOptional()
  contactos?: string | null;

  @ApiPropertyOptional({
    enum: SubtipoEntregaOnline,
    description: 'Obrigatório se ONLINE',
  })
  subtipo_online?: SubtipoEntregaOnline | null;

  @ApiPropertyOptional({
    description: 'Obrigatório se URL_FORMULARIO_EXTERNO',
  })
  url_externa?: string | null;

  @ApiPropertyOptional({
    description: 'Obrigatório se EMAIL_INSTITUCIONAL',
  })
  email_institucional?: string | null;

  @ApiPropertyOptional()
  instrucoes?: string | null;
}
