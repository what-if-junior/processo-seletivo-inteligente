import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/transformers';
import { Oferta } from '../../ofertas/entities/oferta.entity';

@Entity('DistribuicaoCotas')
export class DistribuicaoCota {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({
    type: 'bigint',
    insert: false,
    update: false,
    transformer: numericTransformer,
  })
  id_oferta: number;

  @Column({ type: 'varchar', length: 50 })
  tipo_cota: string;

  @Column({ type: 'smallint', nullable: true })
  vagas?: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  percentual?: string | null;

  @ManyToOne(() => Oferta, (oferta) => oferta.distribuicao_cotas)
  @JoinColumn({ name: 'id_oferta' })
  oferta?: Oferta;
}
