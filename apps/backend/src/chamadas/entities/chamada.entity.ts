import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/transformers';
import { Oferta } from '../../ofertas/entities/oferta.entity';
import { ChamadaVaga } from './chamada-vaga.entity';
import { ClassificacaoItem } from './classificacao-item.entity';

/** W24 — cada convocação de uma oferta congela vagas e listas (REQ-3.4). */
@Entity('Chamadas')
export class Chamada {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({
    type: 'bigint',
    insert: false,
    update: false,
    transformer: numericTransformer,
  })
  id_oferta: number;

  @Column({ type: 'int' })
  numero: number;

  /** Cópia do flag do edital no momento da geração (REQ-3.2). */
  @Column({ type: 'boolean', default: false })
  fallback_ac_para_rv: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  observacao?: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  criado_em: Date;

  @ManyToOne(() => Oferta)
  @JoinColumn({ name: 'id_oferta' })
  oferta?: Oferta;

  @OneToMany(() => ChamadaVaga, (vaga) => vaga.chamada, {
    cascade: ['insert'],
  })
  vagas?: ChamadaVaga[];

  @OneToMany(() => ClassificacaoItem, (item) => item.chamada, {
    cascade: ['insert'],
  })
  itens?: ClassificacaoItem[];
}
