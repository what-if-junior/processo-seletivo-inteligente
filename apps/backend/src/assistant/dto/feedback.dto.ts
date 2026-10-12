import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class FeedbackDto {
  @IsString()
  @IsNotEmpty()
  messageId!: string; // the messageId returned by POST /assistant/chat

  @IsIn(['up', 'down'])
  thumbs!: 'up' | 'down';
}