import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsPositive, ValidateIf } from 'class-validator';
import { ActivityFieldsDto } from './activity-fields.dto';

export class CreateActivityDto extends ActivityFieldsDto {
  @ApiPropertyOptional({
    description: 'Usuario asignado. Solo admin puede establecerlo.',
    example: 12,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @IsPositive()
  idUsuario?: number;
}
