import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ChatDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sessionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  pageId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  chatInput!: string;

  @IsOptional()
  @IsString()
  audio?: string; // base64, validated for size in service
}