import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Reminder } from '../reminders/reminder.entity';
import { User } from '../users/user.entity';
import { ActivityPriority } from './activity-priority.enum';
import {
  REMINDER_OFFSET_VALUES,
  ReminderOffset,
} from './reminder-offset.enum';

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

  @Column({ type: 'varchar', length: 100, nullable: true })
  categoria: string | null;

  @Column({ type: 'enum', enum: ActivityPriority, nullable: true })
  prioridad: ActivityPriority | null;

  @Column({ name: 'recordatorio_habilitado', type: 'boolean', nullable: true })
  recordatorioHabilitado: boolean | null;

  @Column({
    name: 'recordatorio_minutos_antes',
    type: 'enum',
    enum: REMINDER_OFFSET_VALUES,
    nullable: true,
  })
  recordatorioMinutosAntes: ReminderOffset | null;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_usuario', referencedColumnName: 'id' })
  usuario: User;

  @OneToMany(() => Reminder, (reminder) => reminder.actividad, {
    cascade: ['insert'],
  })
  recordatorios: Reminder[];
}
