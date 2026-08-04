import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PG_ENUM_NAMES, TipoLembreteNotificacao } from '@repo/types';
import { Edital } from '../../editais/entities/edital.entity';
import { numericTransformer } from '../../common/transformers';

@Entity('LembretesNotificacao')
export class LembreteNotificacao {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({
    type: 'enum',
    enum: TipoLembreteNotificacao,
    enumName: PG_ENUM_NAMES.tipoLembreteNotificacao,
    default: TipoLembreteNotificacao.MATRICULA_PRAZO,
  })
  tipo: TipoLembreteNotificacao;

  /** Soft scope: null = all editais. */
  @Column({
    type: 'bigint',
    nullable: true,
    transformer: numericTransformer,
  })
  id_edital?: number | null;

  /**
   * Hours relative to etapa anchor.
   * Negative = before (e.g. -48 = 48h before matrícula fim).
   */
  @Column({ type: 'int', default: -48 })
  offset_horas: number;

  @Column({ length: 255 })
  titulo_template: string;

  @Column({ type: 'text' })
  corpo_template: string;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @Column({ type: 'timestamp', nullable: true })
  ultimo_processamento_em?: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  criado_em: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  atualizado_em: Date;

  @ManyToOne(() => Edital, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_edital' })
  edital?: Edital | null;
}
