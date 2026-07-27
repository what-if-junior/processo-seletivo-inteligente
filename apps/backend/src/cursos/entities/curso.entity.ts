import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Oferta } from '../../ofertas/entities/oferta.entity';

@Entity('Cursos')
export class Curso {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ length: 255 })
  nome: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  eixo_tecnologico?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  requisito_escolaridade?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  area_conhecimento?: string | null;

  @OneToMany(() => Oferta, (oferta) => oferta.curso)
  ofertas?: Oferta[];
}
