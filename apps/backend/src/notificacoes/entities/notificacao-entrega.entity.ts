import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  CanalNotificacao,
  PG_ENUM_NAMES,
  StatusEntregaNotificacao,
} from '@repo/types';
import { Notificacao } from './notificacao.entity';
import { User } from '../../user/entities/user.entity';
import { numericTransformer } from '../../common/transformers';

@Entity('NotificacaoEntregas')
export class NotificacaoEntrega {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({
    type: 'bigint',
    transformer: numericTransformer,
  })
  id_notificacao: number;

  @Column({
    type: 'bigint',
    transformer: numericTransformer,
  })
  id_usuario: number;

  @Column({
    type: 'enum',
    enum: CanalNotificacao,
    enumName: PG_ENUM_NAMES.canalNotificacao,
  })
  canal: CanalNotificacao;

  @Column({
    type: 'enum',
    enum: StatusEntregaNotificacao,
    enumName: PG_ENUM_NAMES.statusEntregaNotificacao,
    default: StatusEntregaNotificacao.PENDENTE,
  })
  status: StatusEntregaNotificacao;

  @Column({ type: 'varchar', length: 512, nullable: true })
  destino?: string | null;

  @Column({ type: 'text', nullable: true })
  detalhe?: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  criado_em: Date;

  @Column({ type: 'timestamp', nullable: true })
  processado_em?: Date | null;

  @ManyToOne(() => Notificacao, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_notificacao' })
  notificacao?: Notificacao;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario?: User;
}
