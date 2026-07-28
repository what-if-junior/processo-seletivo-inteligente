import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/transformers';
import { Candidatura } from '../../candidaturas/entities/candidatura.entity';
import { FaixaSalarioMinimo } from '../../faixas/entities/faixa-salario-minimo.entity';

@Entity('RespostasSocioeconomicas')
export class RespostaSocioeconomica {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({
    type: 'bigint',
    insert: false,
    update: false,
    transformer: numericTransformer,
  })
  id_candidatura: number;

  @Column({
    type: 'bigint',
    nullable: true,
    insert: false,
    update: false,
    transformer: numericTransformer,
  })
  id_faixa?: number | null;

  @Column({ type: 'int', nullable: true })
  numero_pessoas?: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  faixa_rotulo_snapshot?: string | null;

  @Column({
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  faixa_multiplicador_min_snapshot?: number | null;

  @Column({
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  faixa_multiplicador_max_snapshot?: number | null;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  salario_minimo_ref_snapshot?: number | null;

  @Column({ type: 'boolean', default: false })
  incompleto_regra_b: boolean;

  @Column({ type: 'boolean', default: false })
  arquivado: boolean;

  @Column({ type: 'jsonb', nullable: true })
  campos_extras?: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp' })
  criado_em: Date;

  @Column({ type: 'timestamp', nullable: true })
  arquivado_em?: Date | null;

  @ManyToOne(() => Candidatura, (c) => c.respostas_socioeconomicas, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_candidatura' })
  candidatura?: Candidatura;

  @ManyToOne(() => FaixaSalarioMinimo, { nullable: true })
  @JoinColumn({ name: 'id_faixa' })
  faixa?: FaixaSalarioMinimo | null;
}
