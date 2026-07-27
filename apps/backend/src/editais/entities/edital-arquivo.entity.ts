import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/transformers';
import { Edital } from './edital.entity';

@Entity('EditalArquivos')
export class EditalArquivo {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({
    type: 'bigint',
    insert: false,
    update: false,
    transformer: numericTransformer,
  })
  id_edital: number;

  @Column({ type: 'bytea', select: false })
  arquivo: Buffer;

  @CreateDateColumn({ type: 'timestamp' })
  criado_em: Date;

  @ManyToOne(() => Edital, (edital) => edital.arquivos)
  @JoinColumn({ name: 'id_edital' })
  edital?: Edital;
}
