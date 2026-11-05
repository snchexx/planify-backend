import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { Repository } from 'typeorm';
import { RegisterDto } from '../users/dto/register.dto';
import { Role } from '../users/role.enum';
import { UserStatus } from '../users/user-status.enum';
import { User } from '../users/user.entity';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const usersRepository = {
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const jwtService = { signAsync: jest.fn() };
  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService(
      usersRepository as unknown as Repository<User>,
      jwtService as unknown as JwtService,
    );
    jwtService.signAsync.mockResolvedValue('signed-token');
  });

  it('hashes the password and never accepts a role during registration', async () => {
    const registration = {
      email: ' New.User@example.com ',
      password: 'a-secure-password',
      role: Role.ADMIN,
      identificacion: '1234567890',
      nombres: 'Ana María',
      apellidos: 'Pérez Gómez',
    } as RegisterDto;
    usersRepository.findOneBy.mockResolvedValue(null);
    usersRepository.create.mockImplementation((user) => user);
    usersRepository.save.mockImplementation(async (user) => ({
      ...user,
      id: 1,
      createdAt: new Date(),
    }));

    const result = await authService.register(registration);
    const createdUser = usersRepository.create.mock.calls[0][0] as User;

    expect(createdUser.email).toBe('new.user@example.com');
    expect(createdUser.identificacion).toBe('1234567890');
    expect(createdUser.nombres).toBe('Ana María');
    expect(createdUser.apellidos).toBe('Pérez Gómez');
    expect(createdUser.role).toBe(Role.USER);
    expect(createdUser.estado).toBe(UserStatus.ACTIVE);
    expect(createdUser.passwordHash).not.toBe(registration.password);
    await expect(
      compare(registration.password, createdUser.passwordHash),
    ).resolves.toBe(true);
    expect(result).toEqual({
      accessToken: 'signed-token',
      user: {
        id: 1,
        identificacion: '1234567890',
        nombres: 'Ana María',
        apellidos: 'Pérez Gómez',
        email: 'new.user@example.com',
        role: Role.USER,
        estado: UserStatus.ACTIVE,
      },
    });
  });

  it('rejects invalid login credentials without revealing which value was wrong', async () => {
    const queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    usersRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    await expect(
      authService.login({ email: 'user@example.com', password: 'password123' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('does not allow blocked users to log in', async () => {
    const queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockImplementation(async () => ({
        id: 1,
        email: 'user@example.com',
        passwordHash: await hash('password123', 4),
        role: Role.USER,
        estado: UserStatus.BLOCKED,
      })),
    };
    usersRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    await expect(
      authService.login({ email: 'user@example.com', password: 'password123' }),
    ).rejects.toThrow('La cuenta está bloqueada');
  });
});
