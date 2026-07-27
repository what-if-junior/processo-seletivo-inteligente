import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import {
  MetodoSelecao,
  MeritoTipo,
  PG_ENUM_NAMES,
  TermosModo,
} from '@repo/types';
import { EditalArquivo } from './edital-arquivo.entity';
import { Oferta } from '../../ofertas/entities/oferta.entity';

@Entity('Editais')
export class Edital {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ length: 255 })
  numero_ano: string;

  @Column({
    type: 'enum',
    enum: MetodoSelecao,
    enumName: PG_ENUM_NAMES.metodoSelecao,
  })
  metodo_selecao: MetodoSelecao;

  @Column({
    type: 'enum',
    enum: MeritoTipo,
    enumName: PG_ENUM_NAMES.meritoTipo,
    nullable: true,
  })
  merito_tipo?: MeritoTipo | null;

  @Column({ type: 'boolean', default: false })
  is_simplificado: boolean;

  @Column({ type: 'boolean', default: false })
  fallback_ac_para_rv: boolean;

  @Column({
    type: 'enum',
    enum: TermosModo,
    enumName: PG_ENUM_NAMES.termosModo,
  })
  termos_modo: TermosModo;

  @Column({ length: 2048 })
  termos_valor: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  link_oficial?: string | null;

  @Column({ type: 'boolean', default: false })
  publicado: boolean;

  @Column({ type: 'boolean', default: false })
  inscricoes_abertas: boolean;

  @OneToMany(() => EditalArquivo, (arquivo) => arquivo.edital)
  arquivos?: EditalArquivo[];

  @OneToMany(() => Oferta, (oferta) => oferta.edital)
  ofertas?: Oferta[];
}
