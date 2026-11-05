import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../role.enum';
import { UserStatus } from '../user-status.enum';

export class UserResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ example: '1234567890', nullable: true })
  identificacion: string | null;

  @ApiProperty({ example: 'Ana María', nullable: true })
  nombres: string | null;

  @ApiProperty({ example: 'Pérez Gómez', nullable: true })
  apellidos: string | null;

  @ApiProperty({ example: 'usuario@ejemplo.com' })
  email: string;

  @ApiProperty({ enum: Role })
  role: Role;

  @ApiProperty({ enum: UserStatus })
  estado: UserStatus;

  @ApiProperty()
  createdAt: Date;
}
