import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({ example: 12 })
  idUsuario: number;
}
