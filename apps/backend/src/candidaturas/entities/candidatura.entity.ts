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
  StatusCandidatura,
  TipoIngresso,
  TipoVagaCandidatura,
} from '@repo/types';
import { User } from '../../user/entities/user.entity';
import { Curso } from '../../cursos/entities/curso.entity';
import { Documento } from '../../documentos/entities/documento.entity';
import { EtapaProcesso } from '../../etapas-processo/entities/etapa-processo.entity';
import { numericTransformer } from '../../common/transformers';

@Entity('Candidaturas')
export class Candidatura {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({
    type: 'bigint',
    insert: false,
    update: false,
    transformer: numericTransformer,
  })
  id_usuario: number;

  @Column({
    type: 'bigint',
    insert: false,
    update: false,
    transformer: numericTransformer,
  })
  id_curso: number;

  @Column({ type: 'date' })
  data_inscricao: string;

  @Column({
    type: 'enum',
    enum: StatusCandidatura,
    enumName: PG_ENUM_NAMES.statusCandidatura,
    default: StatusCandidatura.INSCRICAO_RECEBIDA,
  })
  status: StatusCandidatura;

  @Column({
    type: 'enum',
    enum: TipoIngresso,
    enumName: PG_ENUM_NAMES.tipoIngresso,
    nullable: true,
  })
  tipo_ingresso?: TipoIngresso | null;

  @Column({
    type: 'enum',
    enum: TipoVagaCandidatura,
    enumName: PG_ENUM_NAMES.tipoVaga,
    default: TipoVagaCandidatura.AC,
  })
  tipo_vaga: TipoVagaCandidatura;

  @ManyToOne(() => User, (user) => user.candidaturas)
  @JoinColumn({ name: 'id_usuario' })
  usuario?: User;

  @ManyToOne(() => Curso, (curso) => curso.candidaturas)
  @JoinColumn({ name: 'id_curso' })
  curso?: Curso;

  @OneToMany(() => Documento, (documento) => documento.candidatura)
  documentos?: Documento[];

  @OneToMany(() => EtapaProcesso, (etapa) => etapa.candidatura)
  etapas?: EtapaProcesso[];
}
