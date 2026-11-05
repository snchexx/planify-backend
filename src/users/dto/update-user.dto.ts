import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ValidateIf,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  Validate,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Role } from '../role.enum';
import { UserStatus } from '../user-status.enum';
import { PasswordByteLengthValidator } from './password-byte-length.validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'nuevo@ejemplo.com', maxLength: 255 })
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: '1234567890', maxLength: 50 })
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  identificacion?: string;

  @ApiPropertyOptional({ example: 'Ana María', maxLength: 100 })
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombres?: string;

  @ApiPropertyOptional({ example: 'Pérez Gómez', maxLength: 100 })
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  apellidos?: string;

  @ApiPropertyOptional({
    example: 'contraseña-actualizada',
    minLength: 8,
    maxLength: 72,
    writeOnly: true,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(8)
  @Validate(PasswordByteLengthValidator)
  password?: string;

  @ApiPropertyOptional({ enum: Role })
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ enum: UserStatus })
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(UserStatus)
  estado?: UserStatus;
}
