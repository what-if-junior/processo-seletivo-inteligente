import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type {
  AssistantSentimento,
  AssistantThumbs,
} from '@repo/types';
import { numericTransformer } from '../../common/transformers';

/** W34 audit log of chat interactions with the assistant (REQ-7.x). */
@Entity('AssistantInteracoes')
export class AssistantInteracao {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  /** Client chat session identifier (UUID). */
  @Column({ length: 64 })
  session_id: string;

  /** Usuarios.id when authenticated; NULL for anonymous users. Soft ref, no hard FK. */
  @Column({
    type: 'bigint',
    nullable: true,
    transformer: numericTransformer,
  })
  id_usuario?: number | null;

  /** PWA page/route where the chat was opened (e.g. edital detail). */
  @Column({ type: 'varchar', length: 255, nullable: true })
  page_id?: string | null;

  /** Raw user message sent to the assistant. */
  @Column({ type: 'text' })
  chat_input: string;

  /** TRUE when the message was captured via voice input. */
  @Column({ type: 'boolean', default: false })
  audio_flag: boolean;

  /** Assistant answer returned by n8n. NULL when the interaction failed. */
  @Column({ type: 'text', nullable: true })
  resposta_agente?: string | null;

  /** JSON array of sources/files used to answer (edital PDFs, docs). */
  @Column({ type: 'json', nullable: true })
  arquivos_usados?: unknown[] | null;

  /** Sentiment computed by n8n: positivo|neutro|negativo. */
  @Column({ type: 'varchar', length: 32, nullable: true })
  sentimento?: AssistantSentimento;

  /** User feedback: up|down, NULL when not rated. */
  @Column({ type: 'varchar', length: 8, nullable: true })
  thumbs?: AssistantThumbs;

  @CreateDateColumn({ type: 'timestamp' })
  criado_em: Date;
}