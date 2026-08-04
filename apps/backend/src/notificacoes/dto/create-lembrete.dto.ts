import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoLembreteNotificacao } from '@repo/types';

export class CreateLembreteDto {
  @ApiProperty({
    enum: TipoLembreteNotificacao,
    example: TipoLembreteNotificacao.MATRICULA_PRAZO,
  })
  tipo: TipoLembreteNotificacao;

  @ApiPropertyOptional({
    nullable: true,
    description: 'null = aplica a todos os editais',
  })
  id_edital?: number | null;

  @ApiProperty({
    example: -48,
    description: 'Horas relativas à âncora da etapa (negativo = antes)',
  })
  offset_horas: number;

  @ApiProperty({ example: 'Prazo de matrícula se aproximando' })
  titulo_template: string;

  @ApiProperty({
    example:
      'A matrícula do processo {{edital}} encerra em {{data_fim}}. Regularize pelo app.',
  })
  corpo_template: string;

  @ApiPropertyOptional({ default: true })
  ativo?: boolean;
}

export class UpdateLembreteDto {
  @ApiPropertyOptional({ enum: TipoLembreteNotificacao })
  tipo?: TipoLembreteNotificacao;

  @ApiPropertyOptional({ nullable: true })
  id_edital?: number | null;

  @ApiPropertyOptional()
  offset_horas?: number;

  @ApiPropertyOptional()
  titulo_template?: string;

  @ApiPropertyOptional()
  corpo_template?: string;

  @ApiPropertyOptional()
  ativo?: boolean;
}
