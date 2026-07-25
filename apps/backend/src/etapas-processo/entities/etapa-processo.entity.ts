import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  PG_ENUM_NAMES,
  ResultadoEtapa,
  TipoEtapaProcesso,
} from '@repo/types';
import { Candidatura } from '../../candidaturas/entities/candidatura.entity';
import { Gestor } from '../../gestores/entities/gestor.entity';
import { Recurso } from '../../recursos/entities/recurso.entity';
import { numericTransformer } from '../../common/transformers';

/** Tabela "Etapas Processo": o nome com espaco vem do schema original. */
@Entity('Etapas Processo')
export class EtapaProcesso {
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
    insert: false,
    update: false,
    transformer: numericTransformer,
  })
  id_gestor: number;

  @Column({
    type: 'enum',
    enum: TipoEtapaProcesso,
    enumName: PG_ENUM_NAMES.etapaProcesso,
    default: TipoEtapaProcesso.PERIODO_INSCRICOES,
  })
  tipo_etapa: TipoEtapaProcesso;

  @Column({
    type: 'enum',
    enum: ResultadoEtapa,
    enumName: PG_ENUM_NAMES.resultadoEtapa,
    default: ResultadoEtapa.PENDENTE,
  })
  status: ResultadoEtapa;

  @Column({
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  pontuacao?: number | null;

  @Column({ length: 255 })
  observacoes: string;

  @Column({ type: 'date' })
  data_realizacao: string;

  @Column({ type: 'date' })
  prazo: string;

  @ManyToOne(() => Candidatura, (candidatura) => candidatura.etapas, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_candidatura' })
  candidatura?: Candidatura;

  @ManyToOne(() => Gestor, (gestor) => gestor.etapas)
  @JoinColumn({ name: 'id_gestor' })
  gestor?: Gestor;

  @OneToMany(() => Recurso, (recurso) => recurso.etapa)
  recursos?: Recurso[];
}
