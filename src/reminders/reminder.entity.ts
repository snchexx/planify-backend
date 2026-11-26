import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Activity } from '../activities/activity.entity';
import { ReminderStatus } from './reminder-status.enum';

@Entity('recordatorios')
@Index('IDX_recordatorios_estado_programado', ['status', 'scheduledAtUtc'])
@Index('IDX_recordatorios_lease', ['leaseId'])
export class Reminder {
  @PrimaryGeneratedColumn({ name: 'id_recordatorio' })
  idRecordatorio: number;

  @Column({ name: 'fecha_recordatorio', type: 'date' })
  fechaRecordatorio: string;

  @Column({ name: 'hora_recordatorio', type: 'time' })
  horaRecordatorio: string;

  @Column({ name: 'scheduled_at_utc', type: 'datetime', nullable: true })
  scheduledAtUtc: Date | null;

  @Column({
    name: 'estado_envio',
    type: 'enum',
    enum: ReminderStatus,
    default: ReminderStatus.PENDING,
  })
  status: ReminderStatus;

  @Column({ name: 'intentos_envio', type: 'int', default: 0 })
  attempts: number;

  @Column({
    name: 'next_attempt_at_utc',
    type: 'datetime',
    nullable: true,
  })
  nextAttemptAtUtc: Date | null;

  @Column({ name: 'lease_id', type: 'char', length: 36, nullable: true })
  leaseId: string | null;

  @Column({ name: 'lease_until_utc', type: 'datetime', nullable: true })
  leaseUntilUtc: Date | null;

  @Column({ name: 'sent_at_utc', type: 'datetime', nullable: true })
  sentAtUtc: Date | null;

  @Column({ name: 'last_error', type: 'varchar', length: 200, nullable: true })
  lastError: string | null;

  @ManyToOne(() => Activity, (activity) => activity.recordatorios, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_actividad', referencedColumnName: 'idActividad' })
  actividad: Activity;
}
