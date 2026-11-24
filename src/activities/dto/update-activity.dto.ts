import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsMilitaryTime,
  IsNotEmpty,
  IsPositive,
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

export class UpdateActivityDto {
  @ApiPropertyOptional({ example: 'Reunión de planificación', maxLength: 150 })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombreActividad?: string;

  @ApiPropertyOptional({ example: 'Revisar el plan semanal del equipo.' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(5000)
  descripcion?: string;

  @ApiPropertyOptional({ example: '2026-11-12', format: 'date' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fechaActividad?: string;

  @ApiPropertyOptional({ example: '14:30', format: 'time' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsMilitaryTime()
  horaActividad?: string;

  @ApiPropertyOptional({
    description: 'Categoría elegida, puede ser una categoría personalizada.',
    example: 'Estudio',
    maxLength: 100,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  categoria?: string;

  @ApiPropertyOptional({
    enum: ActivityPriority,
    example: ActivityPriority.MEDIUM,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(ActivityPriority)
  prioridad?: ActivityPriority;

  @ApiPropertyOptional({
    description: 'Indica si se debe recibir una notificación antes.',
    example: true,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  recordatorioHabilitado?: boolean;

  @ApiPropertyOptional({
    description: 'Minutos de anticipación: 15, 25, 35, 45 o 60.',
    enum: REMINDER_OFFSET_VALUES,
    example: ReminderOffset.MINUTES_15,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @IsIn(REMINDER_OFFSET_VALUES)
  recordatorioMinutosAntes?: ReminderOffset;

  @ApiPropertyOptional({
    description: 'Usuario asignado. Solo admin puede establecerlo.',
    example: 12,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  idUsuario?: number;
}
