import {
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/transformers';

/** Singleton row (id = 1) holding global SM reference (REQ-1.7). */
@Entity('ConfiguracaoGlobal')
export class ConfiguracaoGlobal {
  @PrimaryColumn({ type: 'int', default: 1 })
  id: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  salario_minimo_referencia: number;

  @UpdateDateColumn({ type: 'timestamp' })
  atualizado_em: Date;
}
