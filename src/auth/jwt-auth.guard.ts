import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthenticatedUser } from './authenticated-user';
import { UserStatus } from '../users/user-status.enum';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: AuthenticatedUser;
    }>();
    const authorization =
      request.headers.authorization?.trim().split(/\s+/) ?? [];
    const [scheme, token] = authorization;

    if (
      authorization.length !== 2 ||
      scheme.toLowerCase() !== 'bearer' ||
      !token
    ) {
      throw new UnauthorizedException('Se requiere un token Bearer');
    }

    let subject: number;
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: number }>(token);
      subject = payload.sub;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    if (!Number.isInteger(subject) || subject < 1) {
      throw new UnauthorizedException('Token inválido');
    }

    const user = await this.authService.findAuthenticatedUser(subject);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    if (user.estado === UserStatus.BLOCKED) {
      throw new UnauthorizedException('La cuenta está bloqueada');
    }

    request.user = user;
    return true;
  }
}
