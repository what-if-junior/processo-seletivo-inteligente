import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PG_ENUM_NAMES, TipoCarrossel } from '@repo/types';
import { numericTransformer } from '../../common/transformers';

@Entity('CarrosselItens')
export class CarrosselItem {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({
    type: 'enum',
    enum: TipoCarrossel,
    enumName: PG_ENUM_NAMES.tipoCarrossel,
    default: TipoCarrossel.MANUAL,
  })
  tipo: TipoCarrossel;

  @Column({ type: 'varchar', length: 255, nullable: true })
  rotulo?: string | null;

  @Column({ length: 255 })
  titulo: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  subtitulo?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cta_texto?: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  cta_link?: string | null;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  imagem_url?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  icone?: string | null;

  @Column({ type: 'int', default: 0 })
  ordem: number;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  /** FK → Editais (04_schema_extras). Auto cards: one row per id_edital (19_w32). */
  @Column({
    type: 'bigint',
    nullable: true,
    transformer: numericTransformer,
  })
  id_edital?: number | null;

  @Column({ type: 'boolean', default: true })
  auto_edital_habilitado: boolean;

  @Column({ type: 'timestamp', nullable: true })
  inicio_em?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  fim_em?: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  criado_em: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  atualizado_em: Date;
}
