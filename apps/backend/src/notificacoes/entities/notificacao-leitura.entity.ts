import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Notificacao } from './notificacao.entity';
import { User } from '../../user/entities/user.entity';
import { numericTransformer } from '../../common/transformers';

@Entity('NotificacaoLeituras')
export class NotificacaoLeitura {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({
    type: 'bigint',
    insert: false,
    update: false,
    transformer: numericTransformer,
  })
  id_notificacao: number;

  @Column({
    type: 'bigint',
    insert: false,
    update: false,
    transformer: numericTransformer,
  })
  id_usuario: number;

  @Column({ type: 'timestamp', nullable: true })
  lida_em?: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  criado_em: Date;

  @ManyToOne(() => Notificacao, (n) => n.leituras, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_notificacao' })
  notificacao?: Notificacao;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario?: User;
}
