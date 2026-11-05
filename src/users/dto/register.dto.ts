import { IntersectionType } from '@nestjs/swagger';
import { CredentialsDto } from './credentials.dto';
import { UserProfileFieldsDto } from './user-profile-fields.dto';

export class RegisterDto extends IntersectionType(
  CredentialsDto,
  UserProfileFieldsDto,
) {}
