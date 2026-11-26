import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CredentialsDto } from '../users/dto/credentials.dto';
import { RegisterDto } from '../users/dto/register.dto';
import { RequestPasswordResetDto } from '../users/dto/request-password-reset.dto';
import { ResetPasswordDto } from '../users/dto/reset-password.dto';
import { PasswordRecoveryService } from './password-recovery.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordRecoveryService: PasswordRecoveryService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar una cuenta de usuario' })
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión y obtener un JWT' })
  login(@Body() body: CredentialsDto) {
    return this.authService.login(body);
  }

  @Post('password/forgot')
  @ApiOperation({ summary: 'Solicitar un código para recuperar contraseña' })
  requestPasswordReset(@Body() body: RequestPasswordResetDto) {
    return this.passwordRecoveryService.requestCode(body.email);
  }

  @Post('password/reset')
  @ApiOperation({ summary: 'Restablecer contraseña con un código' })
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.passwordRecoveryService.resetPassword(body);
  }
}
