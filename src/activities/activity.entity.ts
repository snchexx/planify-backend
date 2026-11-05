import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('actividades')
export class Activity {
  @PrimaryGeneratedColumn({ name: 'id_actividad' })
  idActividad: number;

  @Column({ name: 'nombre_actividad', type: 'varchar', length: 150 })
  nombreActividad: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ name: 'fecha_actividad', type: 'date' })
  fechaActividad: string;

  @Column({ name: 'hora_actividad', type: 'time' })
  horaActividad: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_usuario', referencedColumnName: 'id' })
  usuario: User;
}
