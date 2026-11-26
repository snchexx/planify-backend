import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'node:crypto';
import { compare, hash } from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';
import { PasswordResetCode } from '../users/password-reset-code.entity';
import { User } from '../users/user.entity';
import { ResetPasswordDto } from '../users/dto/reset-password.dto';
import { MailerService } from './mailer.service';

const CODE_TTL_MINUTES = 10;
const CODE_TTL_MS = CODE_TTL_MINUTES * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;
const BCRYPT_ROUNDS = 12;
const GENERIC_REQUEST_RESPONSE = {
  message: 'Si el correo está registrado, recibirás un código de recuperación.',
};
const INVALID_CODE_MESSAGE = 'El código es incorrecto o expiró.';

@Injectable()
export class PasswordRecoveryService {
  private readonly logger = new Logger(PasswordRecoveryService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(PasswordResetCode)
    private readonly resetCodesRepository: Repository<PasswordResetCode>,
    private readonly dataSource: DataSource,
    private readonly mailerService: MailerService,
  ) {}

  async requestCode(emailInput: string) {
    const email = emailInput.trim().toLowerCase();
    const user = await this.usersRepository.findOneBy({ email });
    if (!user) {
      return GENERIC_REQUEST_RESPONSE;
    }

    const now = new Date();
    const existingCode = await this.resetCodesRepository.findOneBy({
      userId: user.id,
    });
    if (
      existingCode &&
      now.getTime() - existingCode.requestedAt.getTime() < RESEND_COOLDOWN_MS
    ) {
      return GENERIC_REQUEST_RESPONSE;
    }

    const code = randomInt(100_000, 1_000_000).toString();
    const codeHash = await hash(code, BCRYPT_ROUNDS);
    await this.resetCodesRepository.save(
      this.resetCodesRepository.create({
        userId: user.id,
        codeHash,
        expiresAt: new Date(now.getTime() + CODE_TTL_MS),
        requestedAt: now,
        attempts: 0,
      }),
    );

    try {
      await this.mailerService.sendPasswordResetCode(
        email,
        code,
        CODE_TTL_MINUTES,
      );
    } catch (error) {
      await this.resetCodesRepository.delete({ userId: user.id, codeHash });
      this.logger.error(
        `Password recovery email delivery failed (${error instanceof Error ? error.name : 'UnknownError'})`,
      );
      throw new ServiceUnavailableException(
        'No se pudo enviar el código. Inténtalo más tarde.',
      );
    }

    return GENERIC_REQUEST_RESPONSE;
  }

  async resetPassword(input: ResetPasswordDto): Promise<{ message: string }> {
    const email = input.email.trim().toLowerCase();
    const user = await this.usersRepository.findOneBy({ email });
    if (!user) {
      throw new BadRequestException(INVALID_CODE_MESSAGE);
    }

    const updated = await this.dataSource.transaction(async (manager) => {
      const resetCodesRepository = manager.getRepository(PasswordResetCode);
      const usersRepository = manager.getRepository(User);
      const resetCode = await resetCodesRepository.findOne({
        where: { userId: user.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!resetCode) {
        return false;
      }

      if (
        resetCode.expiresAt.getTime() <= Date.now() ||
        resetCode.attempts >= MAX_CODE_ATTEMPTS
      ) {
        await resetCodesRepository.delete({ userId: user.id });
        return false;
      }

      if (!(await compare(input.code, resetCode.codeHash))) {
        resetCode.attempts += 1;
        if (resetCode.attempts >= MAX_CODE_ATTEMPTS) {
          await resetCodesRepository.delete({ userId: user.id });
        } else {
          await resetCodesRepository.save(resetCode);
        }
        return false;
      }

      const currentUser = await usersRepository.findOneBy({ id: user.id });
      if (!currentUser) {
        await resetCodesRepository.delete({ userId: user.id });
        return false;
      }

      currentUser.passwordHash = await hash(input.password, BCRYPT_ROUNDS);
      await usersRepository.save(currentUser);
      await resetCodesRepository.delete({ userId: user.id });
      return true;
    });

    if (!updated) {
      throw new BadRequestException(INVALID_CODE_MESSAGE);
    }

    return { message: 'Contraseña restablecida. Ya puedes iniciar sesión.' };
  }
}
