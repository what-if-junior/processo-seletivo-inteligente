import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { numericTransformer } from '../../common/transformers';

/**
 * W31-09 — Inscrição de Web Push por usuário (VAPID).
 * Uma linha por (id_usuario, endpoint). Endpoints expirados (404/410 no envio)
 * são removidos pelo PushService.
 */
@Entity('PushSubscriptions')
@Index(['id_usuario', 'endpoint'], { unique: true })
export class PushSubscription {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({
    type: 'bigint',
    transformer: numericTransformer,
  })
  id_usuario: number;

  @Column({ type: 'varchar', length: 512 })
  endpoint: string;

  @Column({ type: 'varchar', length: 255 })
  p256dh: string;

  @Column({ type: 'varchar', length: 255 })
  auth: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  user_agent?: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  criado_em: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  atualizado_em: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario?: User;
}