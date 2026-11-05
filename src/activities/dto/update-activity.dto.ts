import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsMilitaryTime,
  IsNotEmpty,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

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
  @IsNotEmpty()
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
    description: 'Usuario asignado. Solo admin puede establecerlo.',
    example: 12,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  idUsuario?: number;
}
