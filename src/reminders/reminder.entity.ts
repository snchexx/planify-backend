import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Activity } from '../activities/activity.entity';

@Entity('recordatorios')
export class Reminder {
  @PrimaryGeneratedColumn({ name: 'id_recordatorio' })
  idRecordatorio: number;

  @Column({ name: 'fecha_recordatorio', type: 'date' })
  fechaRecordatorio: string;

  @Column({ name: 'hora_recordatorio', type: 'time' })
  horaRecordatorio: string;

  @ManyToOne(() => Activity, (activity) => activity.recordatorios, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_actividad', referencedColumnName: 'idActividad' })
  actividad: Activity;
}
