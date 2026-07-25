import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { EtapaProcesso } from '../../etapas-processo/entities/etapa-processo.entity';
import { Recurso } from '../../recursos/entities/recurso.entity';
import { numericTransformer } from '../../common/transformers';

@Entity('Gestores')
export class Gestor {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({
    type: 'bigint',
    insert: false,
    update: false,
    transformer: numericTransformer,
  })
  id_usuario: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  funcao?: string | null;

  @ManyToOne(() => User, (user) => user.gestores)
  @JoinColumn({ name: 'id_usuario' })
  usuario?: User;

  @OneToMany(() => EtapaProcesso, (etapa) => etapa.gestor)
  etapas?: EtapaProcesso[];

  @OneToMany(() => Recurso, (recurso) => recurso.gestor)
  recursos?: Recurso[];
}
