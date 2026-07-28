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
import { Oferta } from '../../ofertas/entities/oferta.entity';
import { Edital } from '../../editais/entities/edital.entity';
import { Documento } from '../../documentos/entities/documento.entity';
import { EtapaProcesso } from '../../etapas-processo/entities/etapa-processo.entity';
import { RespostaSocioeconomica } from '../../socioeconomico/entities/resposta-socioeconomica.entity';
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
  id_oferta: number;

  /** Denormalizado para unicidade parcial ativa por usuario x edital. */
  @Column({
    type: 'bigint',
    insert: false,
    update: false,
    transformer: numericTransformer,
  })
  id_edital: number;

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

  @Column({ type: 'varchar', length: 255, nullable: true })
  protocolo?: string | null;

  /** Snapshot: menor na data_inscricao (REQ-2.4). */
  @Column({ type: 'boolean', default: false })
  menor_idade: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  responsavel_nome?: string | null;

  @Column({ type: 'varchar', length: 14, nullable: true })
  responsavel_cpf?: string | null;

  @Column({ type: 'boolean', default: false })
  responsavel_aceite: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  responsavel_documento_nome?: string | null;

  @Column({ type: 'bytea', nullable: true, select: false })
  responsavel_documento?: Buffer | null;

  @ManyToOne(() => User, (user) => user.candidaturas)
  @JoinColumn({ name: 'id_usuario' })
  usuario?: User;

  @ManyToOne(() => Oferta, (oferta) => oferta.candidaturas)
  @JoinColumn({ name: 'id_oferta' })
  oferta?: Oferta;

  @ManyToOne(() => Edital)
  @JoinColumn({ name: 'id_edital' })
  edital?: Edital;

  @OneToMany(() => Documento, (documento) => documento.candidatura)
  documentos?: Documento[];

  @OneToMany(() => EtapaProcesso, (etapa) => etapa.candidatura)
  etapas?: EtapaProcesso[];

  @OneToMany(
    () => RespostaSocioeconomica,
    (resposta) => resposta.candidatura,
  )
  respostas_socioeconomicas?: RespostaSocioeconomica[];
}
