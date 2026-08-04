import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LembreteNotificacao } from './lembrete-notificacao.entity';
import { CronogramaEtapa } from '../../cronograma/entities/cronograma-etapa.entity';
import { User } from '../../user/entities/user.entity';
import { Notificacao } from './notificacao.entity';
import { numericTransformer } from '../../common/transformers';

@Entity('LembreteDisparos')
export class LembreteDisparo {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({
    type: 'bigint',
    transformer: numericTransformer,
  })
  id_lembrete: number;

  @Column({
    type: 'bigint',
    transformer: numericTransformer,
  })
  id_etapa: number;

  @Column({
    type: 'bigint',
    transformer: numericTransformer,
  })
  id_usuario: number;

  @Column({
    type: 'bigint',
    nullable: true,
    transformer: numericTransformer,
  })
  id_notificacao?: number | null;

  @Column({ length: 128 })
  chave: string;

  @CreateDateColumn({ type: 'timestamp' })
  criado_em: Date;

  @ManyToOne(() => LembreteNotificacao, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_lembrete' })
  lembrete?: LembreteNotificacao;

  @ManyToOne(() => CronogramaEtapa, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_etapa' })
  etapa?: CronogramaEtapa;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario?: User;

  @ManyToOne(() => Notificacao, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_notificacao' })
  notificacao?: Notificacao | null;
}
