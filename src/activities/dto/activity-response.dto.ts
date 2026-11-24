import { ApiProperty } from '@nestjs/swagger';
import { ActivityPriority } from '../activity-priority.enum';
import { ReminderOffset } from '../reminder-offset.enum';

export class ActivityResponseDto {
  @ApiProperty({ example: 1 })
  idActividad: number;

  @ApiProperty({ example: 'Reunión de planificación' })
  nombreActividad: string;

  @ApiProperty({ example: 'Revisar el plan semanal del equipo.' })
  descripcion: string;

  @ApiProperty({ example: '2026-11-12', format: 'date' })
  fechaActividad: string;

  @ApiProperty({ example: '14:30:00', format: 'time' })
  horaActividad: string;

  @ApiProperty({ example: 'Estudio', nullable: true })
  categoria: string | null;

  @ApiProperty({ enum: ActivityPriority, nullable: true })
  prioridad: ActivityPriority | null;

  @ApiProperty({ example: true, nullable: true })
  recordatorioHabilitado: boolean | null;

  @ApiProperty({ enum: ReminderOffset, nullable: true })
  recordatorioMinutosAntes: ReminderOffset | null;

  @ApiProperty({ example: 12 })
  idUsuario: number;
}
