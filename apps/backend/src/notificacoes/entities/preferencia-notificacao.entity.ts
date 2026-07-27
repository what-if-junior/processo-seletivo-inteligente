import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { numericTransformer } from '../../common/transformers';

@Entity('PreferenciasNotificacao')
export class PreferenciaNotificacao {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({
    type: 'bigint',
    transformer: numericTransformer,
  })
  id_usuario: number;

  @Column({ type: 'boolean', default: false })
  silenciar_email: boolean;

  @Column({ type: 'boolean', default: false })
  silenciar_push: boolean;

  @Column({ type: 'boolean', default: false })
  silenciar_oficiais: boolean;

  @UpdateDateColumn({ type: 'timestamp' })
  atualizado_em: Date;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario?: User;
}
