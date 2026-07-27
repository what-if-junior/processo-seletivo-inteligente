import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PG_ENUM_NAMES, TurnoOferta } from '@repo/types';
import { numericTransformer } from '../../common/transformers';
import { Campus } from '../../campus/entities/campus.entity';
import { Curso } from '../../cursos/entities/curso.entity';
import { Edital } from '../../editais/entities/edital.entity';
import { DistribuicaoCota } from '../../distribuicao-cotas/entities/distribuicao-cota.entity';
import { Candidatura } from '../../candidaturas/entities/candidatura.entity';

@Entity('Ofertas')
export class Oferta {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({
    type: 'bigint',
    insert: false,
    update: false,
    transformer: numericTransformer,
  })
  id_edital: number;

  @Column({
    type: 'bigint',
    insert: false,
    update: false,
    transformer: numericTransformer,
  })
  id_curso: number;

  @Column({
    type: 'bigint',
    insert: false,
    update: false,
    transformer: numericTransformer,
  })
  id_campus: number;

  @Column({
    type: 'enum',
    enum: TurnoOferta,
    enumName: PG_ENUM_NAMES.turno,
  })
  turno: TurnoOferta;

  @Column({ type: 'smallint' })
  vagas_totais: number;

  @ManyToOne(() => Edital, (edital) => edital.ofertas)
  @JoinColumn({ name: 'id_edital' })
  edital?: Edital;

  @ManyToOne(() => Curso, (curso) => curso.ofertas)
  @JoinColumn({ name: 'id_curso' })
  curso?: Curso;

  @ManyToOne(() => Campus, (campus) => campus.ofertas)
  @JoinColumn({ name: 'id_campus' })
  campus?: Campus;

  @OneToMany(() => DistribuicaoCota, (cota) => cota.oferta)
  distribuicao_cotas?: DistribuicaoCota[];

  @OneToMany(() => Candidatura, (candidatura) => candidatura.oferta)
  candidaturas?: Candidatura[];
}
