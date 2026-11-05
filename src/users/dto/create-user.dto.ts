import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { ValidateIf, IsEnum } from 'class-validator';
import { Role } from '../role.enum';
import { UserStatus } from '../user-status.enum';
import { CredentialsDto } from './credentials.dto';
import { UserProfileFieldsDto } from './user-profile-fields.dto';

export class CreateUserDto extends IntersectionType(
  CredentialsDto,
  UserProfileFieldsDto,
) {
  @ApiPropertyOptional({ enum: Role, default: Role.USER })
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ enum: UserStatus, default: UserStatus.ACTIVE })
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(UserStatus)
  estado?: UserStatus;
}
