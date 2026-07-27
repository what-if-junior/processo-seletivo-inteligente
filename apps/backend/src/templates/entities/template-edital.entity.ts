import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TemplateBiblioteca } from './template-biblioteca.entity';
import { numericTransformer } from '../../common/transformers';

@Entity('TemplatesEdital')
export class TemplateEdital {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({
    type: 'bigint',
    nullable: true,
    transformer: numericTransformer,
  })
  id_template_origem?: number | null;

  /** Soft ref until W1 Editais exists. */
  @Column({
    type: 'bigint',
    nullable: true,
    transformer: numericTransformer,
  })
  id_edital?: number | null;

  @Column({ length: 255 })
  titulo: string;

  @Column({ type: 'text' })
  corpo: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  canal?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tipo_uso?: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  criado_em: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  atualizado_em: Date;

  @ManyToOne(() => TemplateBiblioteca, (t) => t.copiasEdital, {
    nullable: true,
  })
  @JoinColumn({ name: 'id_template_origem' })
  templateOrigem?: TemplateBiblioteca | null;
}
