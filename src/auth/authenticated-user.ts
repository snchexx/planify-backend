import { Role } from '../users/role.enum';
import { UserStatus } from '../users/user-status.enum';

export interface AuthenticatedUser {
  id: number;
  identificacion: string | null;
  nombres: string | null;
  apellidos: string | null;
  email: string;
  role: Role;
  estado: UserStatus;
}
