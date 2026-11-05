import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsMilitaryTime,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class ActivityFieldsDto {
  @ApiProperty({ example: 'Reunión de planificación', maxLength: 150 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombreActividad: string;

  @ApiProperty({ example: 'Revisar el plan semanal del equipo.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  descripcion: string;

  @ApiProperty({ example: '2026-11-12', format: 'date' })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fechaActividad: string;

  @ApiProperty({ example: '14:30', format: 'time' })
  @IsMilitaryTime()
  horaActividad: string;
}
