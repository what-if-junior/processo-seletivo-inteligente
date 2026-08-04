import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePreferenciaNotificacaoDto {
  @ApiPropertyOptional({ default: false })
  silenciar_email?: boolean;

  @ApiPropertyOptional({ default: false })
  silenciar_push?: boolean;

  @ApiPropertyOptional({
    default: false,
    description: 'Silencia leitura de avisos oficiais (cronograma/admin)',
  })
  silenciar_oficiais?: boolean;
}
