import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TemplateEdital } from './template-edital.entity';

@Entity('TemplatesBiblioteca')
export class TemplateBiblioteca {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ length: 255 })
  titulo: string;

  @Column({ type: 'text' })
  corpo: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  canal?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tipo_uso?: string | null;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  criado_em: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  atualizado_em: Date;

  @OneToMany(() => TemplateEdital, (t) => t.templateOrigem)
  copiasEdital?: TemplateEdital[];
}
