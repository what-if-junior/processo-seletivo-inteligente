import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Oferta } from '../../ofertas/entities/oferta.entity';

@Entity('Campus')
export class Campus {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ length: 255, unique: true })
  nome: string;

  @OneToMany(() => Oferta, (oferta) => oferta.campus)
  ofertas?: Oferta[];
}
