import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsMilitaryTime,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ActivityPriority } from '../activity-priority.enum';
import {
  REMINDER_OFFSET_VALUES,
  ReminderOffset,
} from '../reminder-offset.enum';

export class ActivityFieldsDto {
  @ApiProperty({ example: 'Reunión de planificación', maxLength: 150 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombreActividad: string;

  @ApiPropertyOptional({ example: 'Revisar el plan semanal del equipo.' })
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(5000)
  descripcion?: string;

  @ApiProperty({ example: '2026-11-12', format: 'date' })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fechaActividad: string;

  @ApiProperty({ example: '14:30', format: 'time' })
  @IsMilitaryTime()
  horaActividad: string;

  @ApiProperty({
    description: 'Categoría elegida, puede ser una categoría personalizada.',
    example: 'Estudio',
    maxLength: 100,
    required: false,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  categoria?: string;

  @ApiProperty({
    enum: ActivityPriority,
    example: ActivityPriority.MEDIUM,
    required: false,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(ActivityPriority)
  prioridad?: ActivityPriority;

  @ApiProperty({
    description: 'Indica si se debe recibir una notificación antes.',
    example: true,
    required: false,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  recordatorioHabilitado?: boolean;

  @ApiProperty({
    description: 'Minutos de anticipación: 15, 25, 35, 45 o 60.',
    enum: REMINDER_OFFSET_VALUES,
    example: ReminderOffset.MINUTES_15,
    required: false,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @IsIn(REMINDER_OFFSET_VALUES)
  recordatorioMinutosAntes?: ReminderOffset;
}
