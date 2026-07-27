import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/transformers';

@Entity('FaixasSalarioMinimo')
export class FaixaSalarioMinimo {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ type: 'int' })
  ordem: number;

  @Column({ length: 255 })
  rotulo: string;

  @Column({
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  multiplicador_min?: number | null;

  @Column({
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  multiplicador_max?: number | null;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  criado_em: Date;
}
