import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrigemNotificacao } from '@repo/types';

export class CreateNotificacaoDto {
  @ApiProperty({ example: 'Alteração no cronograma' })
  titulo: string;

  @ApiProperty({ example: 'A etapa de matrícula foi antecipada para 10/02.' })
  corpo: string;

  @ApiPropertyOptional({ example: '/inscricoes' })
  deep_link?: string | null;

  @ApiPropertyOptional({
    enum: OrigemNotificacao,
    default: OrigemNotificacao.MANUAL,
  })
  origem?: OrigemNotificacao;

  @ApiPropertyOptional({
    description: 'Audience: edital filter (required for cohort send)',
  })
  id_edital?: number | null;

  @ApiPropertyOptional({ description: 'Optional campus name filter' })
  filtro_campus?: string | null;

  @ApiPropertyOptional({
    description: 'Optional candidatura status filter (exact match)',
  })
  filtro_status?: string | null;

  @ApiPropertyOptional({
    description: 'If set and in the future, row is created but not dispatched yet',
  })
  agendado_para?: string | null;

  @ApiPropertyOptional({
    description: 'When true (default), resolve cohort and create leituras/entregas',
    default: true,
  })
  enviar_agora?: boolean;

  @ApiPropertyOptional({
    type: [String],
    description: 'Channels to attempt: pwa | email (default both)',
    example: ['pwa', 'email'],
  })
  canais?: string[];
}
