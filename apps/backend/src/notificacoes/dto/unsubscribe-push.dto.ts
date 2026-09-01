import { ApiProperty } from '@nestjs/swagger';

/** W31-09 — Corpo de POST /notificacoes/push/unsubscribe. */
export class UnsubscribePushDto {
  @ApiProperty({ example: 'https://fcm.googleapis.com/fcm/send/...' })
  endpoint: string;
}