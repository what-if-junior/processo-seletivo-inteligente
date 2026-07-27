import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { Edital } from './edital.entity';

@Entity('EditalArquivos')
export class EditalArquivo {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  /** Populated from FK; writes go through `edital` relation (W1-03). */
  @RelationId((arquivo: EditalArquivo) => arquivo.edital)
  id_edital: number;

  @Column({ type: 'bytea', select: false })
  arquivo: Buffer;

  @CreateDateColumn({ type: 'timestamp' })
  criado_em: Date;

  @ManyToOne(() => Edital, (edital) => edital.arquivos, { nullable: false })
  @JoinColumn({ name: 'id_edital' })
  edital?: Edital;
}
