import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** W31-09 — Corpo de POST /notificacoes/push/subscribe. */
export class SubscribePushDto {
  @ApiProperty({ example: 'https://fcm.googleapis.com/fcm/send/...' })
  endpoint: string;

  @ApiProperty({ example: 'BH...' })
  p256dh: string;

  @ApiProperty({ example: 'Qx...' })
  auth: string;

  @ApiPropertyOptional({ example: 'Mozilla/5.0 ...' })
  user_agent?: string;
}