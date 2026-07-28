import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ListaClassificacao, PG_ENUM_NAMES } from '@repo/types';
import { numericTransformer } from '../../common/transformers';
import { Candidatura } from '../../candidaturas/entities/candidatura.entity';
import { Chamada } from './chamada.entity';

/** W24 — posição do candidato na chamada regular ou na espera (REQ-3.3/3.4). */
@Entity('ClassificacaoItens')
export class ClassificacaoItem {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({
    type: 'bigint',
    insert: false,
    update: false,
    transformer: numericTransformer,
  })
  id_chamada: number;

  @Column({
    type: 'bigint',
    insert: false,
    update: false,
    transformer: numericTransformer,
  })
  id_candidatura: number;

  @Column({
    type: 'enum',
    enum: ListaClassificacao,
    enumName: PG_ENUM_NAMES.listaClassificacao,
  })
  lista: ListaClassificacao;

  /** Lista onde ocupou vaga; difere da cota declarada quando houve fallback. */
  @Column({ type: 'varchar', length: 50 })
  tipo_cota: string;

  @Column({ type: 'int' })
  posicao: number;

  @Column({ type: 'boolean', default: false })
  realocado_para_ac: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  criado_em: Date;

  @ManyToOne(() => Chamada, (chamada) => chamada.itens, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_chamada' })
  chamada?: Chamada;

  @ManyToOne(() => Candidatura)
  @JoinColumn({ name: 'id_candidatura' })
  candidatura?: Candidatura;
}
