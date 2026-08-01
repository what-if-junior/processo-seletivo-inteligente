import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/transformers';
import { Chamada } from './chamada.entity';

/** W24 — vagas ofertadas por cota numa chamada e o que sobrou (REQ-3.1). */
@Entity('ChamadaVagas')
export class ChamadaVaga {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({
    type: 'bigint',
    insert: false,
    update: false,
    transformer: numericTransformer,
  })
  id_chamada: number;

  @Column({ type: 'varchar', length: 50 })
  tipo_cota: string;

  @Column({ type: 'smallint', default: 0 })
  vagas: number;

  @Column({ type: 'smallint', default: 0 })
  preenchidas: number;

  @Column({ type: 'smallint', default: 0 })
  remanescentes: number;

  @ManyToOne(() => Chamada, (chamada) => chamada.vagas, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_chamada' })
  chamada?: Chamada;
}
