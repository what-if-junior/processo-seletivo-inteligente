import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type {
  AssistantIngestaoStatus,
  AssistantOperacao,
} from '@repo/types';
import { numericTransformer } from '../../common/transformers';

/** W34 deferred queue of edital changes to sync into the n8n RAG index (REQ-7.x). */
@Entity('AssistantIngestoes')
export class AssistantIngestao {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  /** Editais.id to (re)ingest. Soft ref, no hard FK (payload is edital metadata; n8n fetches the PDF from termos_valor). */
  @Column({
    type: 'bigint',
    transformer: numericTransformer,
  })
  id_edital: number;

  /** insert|update|delete — change to apply to the RAG index. */
  @Column({ type: 'varchar', length: 16 })
  operacao: AssistantOperacao;

  /** pendente|enviado|erro — flush query reads WHERE status = 'pendente'. */
  @Column({ type: 'varchar', length: 16, default: 'pendente' })
  status: AssistantIngestaoStatus;

  /** Error detail when status = erro. */
  @Column({ type: 'text', nullable: true })
  erro?: string | null;

  /** When the row was flushed to n8n. NULL while pendente. */
  @Column({ type: 'timestamp', nullable: true })
  enviado_em?: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  criado_em: Date;
}