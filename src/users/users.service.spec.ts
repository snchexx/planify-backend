import { Repository } from 'typeorm';
import { compare } from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { Role } from './role.enum';
import { UserStatus } from './user-status.enum';
import { User } from './user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const usersRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };
  let usersService: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    usersService = new UsersService(
      usersRepository as unknown as Repository<User>,
    );
  });

  it('hashes credentials and excludes password hashes from create responses', async () => {
    usersRepository.create.mockImplementation((user) => user);
    usersRepository.save.mockImplementation(async (user) => ({
      ...user,
      id: 5,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }));

    const result = await usersService.create({
      email: 'user@example.com',
      password: 'secure-password',
      identificacion: '1234567890',
      nombres: 'Ana María',
      apellidos: 'Pérez Gómez',
    } as CreateUserDto);

    const persistedUser = usersRepository.create.mock.calls[0][0] as User;
    expect(persistedUser.role).toBe(Role.USER);
    expect(persistedUser.estado).toBe(UserStatus.ACTIVE);
    expect(persistedUser.passwordHash).not.toBe('secure-password');
    await expect(
      compare('secure-password', persistedUser.passwordHash),
    ).resolves.toBe(true);
    expect(result).toEqual({
      id: 5,
      identificacion: '1234567890',
      nombres: 'Ana María',
      apellidos: 'Pérez Gómez',
      email: 'user@example.com',
      role: Role.USER,
      estado: UserStatus.ACTIVE,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    expect(result).not.toHaveProperty('passwordHash');
  });
});
