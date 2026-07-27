import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  PG_ENUM_NAMES,
  StatusContestacao,
  TipoContestacao,
} from '@repo/types';
import { User } from '../../user/entities/user.entity';
import { Candidatura } from '../../candidaturas/entities/candidatura.entity';
import { ContestacaoHistorico } from './contestacao-historico.entity';
import { numericTransformer } from '../../common/transformers';

@Entity('Contestacoes')
export class Contestacao {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({
    type: 'enum',
    enum: TipoContestacao,
    enumName: PG_ENUM_NAMES.tipoContestacao,
  })
  tipo: TipoContestacao;

  @Column({
    type: 'enum',
    enum: StatusContestacao,
    enumName: PG_ENUM_NAMES.statusContestacao,
    default: StatusContestacao.ENVIADA,
  })
  status: StatusContestacao;

  /** FK para Editais (W1). */
  @Column({
    type: 'bigint',
    nullable: true,
    transformer: numericTransformer,
  })
  id_edital?: number | null;

  @Column({
    type: 'bigint',
    nullable: true,
    transformer: numericTransformer,
  })
  id_usuario?: number | null;

  @Column({
    type: 'bigint',
    nullable: true,
    transformer: numericTransformer,
  })
  id_candidatura?: number | null;

  @Column({ type: 'text' })
  texto: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nome_anexo?: string | null;

  @Column({ type: 'bytea', nullable: true, select: false })
  arquivo_anexo?: Buffer | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nome_requerente?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email_requerente?: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  criado_em: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  atualizado_em: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'id_usuario' })
  usuario?: User | null;

  @ManyToOne(() => Candidatura, { nullable: true })
  @JoinColumn({ name: 'id_candidatura' })
  candidatura?: Candidatura | null;

  @OneToMany(() => ContestacaoHistorico, (h) => h.contestacao)
  historico?: ContestacaoHistorico[];
}
