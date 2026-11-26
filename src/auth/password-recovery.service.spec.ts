import { BadRequestException } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { PasswordResetCode } from '../users/password-reset-code.entity';
import { ResetPasswordDto } from '../users/dto/reset-password.dto';
import { User } from '../users/user.entity';
import { MailerService } from './mailer.service';
import { PasswordRecoveryService } from './password-recovery.service';

describe('PasswordRecoveryService', () => {
  const usersRepository = { findOneBy: jest.fn() };
  const resetCodesRepository = {
    findOneBy: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(),
    delete: jest.fn(),
  };
  const dataSource = { transaction: jest.fn() };
  const mailerService = { sendPasswordResetCode: jest.fn() };
  let service: PasswordRecoveryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PasswordRecoveryService(
      usersRepository as unknown as Repository<User>,
      resetCodesRepository as unknown as Repository<PasswordResetCode>,
      dataSource as unknown as DataSource,
      mailerService as unknown as MailerService,
    );
    mailerService.sendPasswordResetCode.mockResolvedValue(undefined);
  });

  it('sends a short-lived hashed code for an existing account', async () => {
    usersRepository.findOneBy.mockResolvedValue({
      id: 8,
      email: 'user@example.com',
    });
    resetCodesRepository.findOneBy.mockResolvedValue(null);
    resetCodesRepository.save.mockImplementation(async (record) => record);

    await expect(service.requestCode(' User@Example.com ')).resolves.toEqual({
      message:
        'Si el correo está registrado, recibirás un código de recuperación.',
    });

    expect(mailerService.sendPasswordResetCode).toHaveBeenCalledWith(
      'user@example.com',
      expect.stringMatching(/^\d{6}$/),
      10,
    );
    const savedCode = resetCodesRepository.save.mock
      .calls[0][0] as PasswordResetCode;
    const emailedCode = mailerService.sendPasswordResetCode.mock
      .calls[0][1] as string;
    expect(savedCode.codeHash).not.toBe(emailedCode);
    await expect(compare(emailedCode, savedCode.codeHash)).resolves.toBe(true);
    expect(savedCode.attempts).toBe(0);
  });

  it('returns the same response and does not send mail for unknown accounts', async () => {
    usersRepository.findOneBy.mockResolvedValue(null);

    await expect(service.requestCode('unknown@example.com')).resolves.toEqual({
      message:
        'Si el correo está registrado, recibirás un código de recuperación.',
    });
    expect(mailerService.sendPasswordResetCode).not.toHaveBeenCalled();
  });

  it('does not send another code during the resend cooldown', async () => {
    usersRepository.findOneBy.mockResolvedValue({
      id: 8,
      email: 'user@example.com',
    });
    resetCodesRepository.findOneBy.mockResolvedValue({
      userId: 8,
      requestedAt: new Date(),
    });

    await expect(service.requestCode('user@example.com')).resolves.toEqual({
      message: 'Si el correo está registrado, recibirás un código de recuperación.',
    });
    expect(mailerService.sendPasswordResetCode).not.toHaveBeenCalled();
    expect(resetCodesRepository.save).not.toHaveBeenCalled();
  });

  it('replaces the password and consumes the code atomically', async () => {
    const user = { id: 8, email: 'user@example.com', passwordHash: '' } as User;
    const resetCode = {
      userId: 8,
      codeHash: await hash('246810', 4),
      expiresAt: new Date(Date.now() + 60_000),
      requestedAt: new Date(),
      attempts: 0,
    } as PasswordResetCode;
    const transactionResetRepository = {
      findOne: jest.fn().mockResolvedValue(resetCode),
      delete: jest.fn(),
      save: jest.fn(),
    };
    const transactionUsersRepository = {
      findOneBy: jest.fn().mockResolvedValue(user),
      save: jest.fn().mockImplementation(async (value) => value),
    };
    const manager = {
      getRepository: jest.fn(
        (entity: typeof User | typeof PasswordResetCode) =>
          entity === PasswordResetCode
            ? transactionResetRepository
            : transactionUsersRepository,
      ),
    };
    usersRepository.findOneBy.mockResolvedValue(user);
    dataSource.transaction.mockImplementation(
      (callback: (manager: EntityManager) => Promise<unknown>) =>
        callback(manager as unknown as EntityManager),
    );

    await expect(
      service.resetPassword({
        email: 'USER@example.com',
        code: '246810',
        password: 'new-secure-password',
      } as ResetPasswordDto),
    ).resolves.toEqual({
      message: 'Contraseña restablecida. Ya puedes iniciar sesión.',
    });

    await expect(
      compare('new-secure-password', user.passwordHash),
    ).resolves.toBe(true);
    expect(transactionResetRepository.delete).toHaveBeenCalledWith({
      userId: user.id,
    });
  });

  it('counts invalid codes and rejects them without changing the password', async () => {
    const user = { id: 8, email: 'user@example.com' } as User;
    const resetCode = {
      userId: 8,
      codeHash: await hash('111111', 4),
      expiresAt: new Date(Date.now() + 60_000),
      requestedAt: new Date(),
      attempts: 0,
    } as PasswordResetCode;
    const transactionResetRepository = {
      findOne: jest.fn().mockResolvedValue(resetCode),
      delete: jest.fn(),
      save: jest.fn(),
    };
    const transactionUsersRepository = { findOneBy: jest.fn() };
    const manager = {
      getRepository: jest.fn(
        (entity: typeof User | typeof PasswordResetCode) =>
          entity === PasswordResetCode
            ? transactionResetRepository
            : transactionUsersRepository,
      ),
    };
    usersRepository.findOneBy.mockResolvedValue(user);
    dataSource.transaction.mockImplementation(
      (callback: (manager: EntityManager) => Promise<unknown>) =>
        callback(manager as unknown as EntityManager),
    );

    await expect(
      service.resetPassword({
        email: 'user@example.com',
        code: '222222',
        password: 'new-secure-password',
      } as ResetPasswordDto),
    ).rejects.toThrow(BadRequestException);

    expect(resetCode.attempts).toBe(1);
    expect(transactionResetRepository.save).toHaveBeenCalledWith(resetCode);
    expect(transactionUsersRepository.findOneBy).not.toHaveBeenCalled();
  });

  it('consumes the code after the fifth invalid attempt', async () => {
    const user = { id: 8, email: 'user@example.com' } as User;
    const resetCode = {
      userId: 8,
      codeHash: await hash('111111', 4),
      expiresAt: new Date(Date.now() + 60_000),
      requestedAt: new Date(),
      attempts: 4,
    } as PasswordResetCode;
    const transactionResetRepository = {
      findOne: jest.fn().mockResolvedValue(resetCode),
      delete: jest.fn(),
      save: jest.fn(),
    };
    const transactionUsersRepository = { findOneBy: jest.fn() };
    const manager = {
      getRepository: jest.fn((entity: typeof User | typeof PasswordResetCode) =>
        entity === PasswordResetCode
          ? transactionResetRepository
          : transactionUsersRepository,
      ),
    };
    usersRepository.findOneBy.mockResolvedValue(user);
    dataSource.transaction.mockImplementation(
      (callback: (manager: EntityManager) => Promise<unknown>) =>
        callback(manager as unknown as EntityManager),
    );

    await expect(
      service.resetPassword({
        email: 'user@example.com',
        code: '222222',
        password: 'new-secure-password',
      } as ResetPasswordDto),
    ).rejects.toThrow(BadRequestException);

    expect(transactionResetRepository.delete).toHaveBeenCalledWith({
      userId: user.id,
    });
    expect(transactionResetRepository.save).not.toHaveBeenCalled();
  });
});
