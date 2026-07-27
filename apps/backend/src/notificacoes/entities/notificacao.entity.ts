import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PG_ENUM_NAMES, OrigemNotificacao } from '@repo/types';
import { Gestor } from '../../gestores/entities/gestor.entity';
import { NotificacaoLeitura } from './notificacao-leitura.entity';
import { numericTransformer } from '../../common/transformers';

@Entity('Notificacoes')
export class Notificacao {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ length: 255 })
  titulo: string;

  @Column({ type: 'text' })
  corpo: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  deep_link?: string | null;

  @Column({
    type: 'enum',
    enum: OrigemNotificacao,
    enumName: PG_ENUM_NAMES.origemNotificacao,
    default: OrigemNotificacao.MANUAL,
  })
  origem: OrigemNotificacao;

  /** Soft ref until W1 Editais exists. */
  @Column({
    type: 'bigint',
    nullable: true,
    transformer: numericTransformer,
  })
  id_edital?: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  filtro_campus?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  filtro_status?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  agendado_para?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  enviado_em?: Date | null;

  @Column({
    type: 'bigint',
    nullable: true,
    transformer: numericTransformer,
  })
  id_gestor?: number | null;

  @CreateDateColumn({ type: 'timestamp' })
  criado_em: Date;

  @ManyToOne(() => Gestor, { nullable: true })
  @JoinColumn({ name: 'id_gestor' })
  gestor?: Gestor | null;

  @OneToMany(() => NotificacaoLeitura, (l) => l.notificacao)
  leituras?: NotificacaoLeitura[];
}
