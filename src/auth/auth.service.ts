import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import { QueryFailedError, Repository } from 'typeorm';
import { Role } from '../users/role.enum';
import { RegisterDto } from '../users/dto/register.dto';
import { User } from '../users/user.entity';
import { UserStatus } from '../users/user-status.enum';
import { AuthenticatedUser } from './authenticated-user';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_ROUNDS = 12;

interface Credentials {
  email: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: RegisterDto) {
    const { email, password } = this.validateCredentials(input);
    const existingUser = await this.usersRepository.findOneBy({ email });
    if (existingUser) {
      throw new ConflictException('El correo ya está registrado');
    }

    const user = this.usersRepository.create({
      identificacion: input.identificacion,
      nombres: input.nombres,
      apellidos: input.apellidos,
      email,
      passwordHash: await hash(password, BCRYPT_ROUNDS),
      role: Role.USER,
      estado: UserStatus.ACTIVE,
    });

    try {
      const savedUser = await this.usersRepository.save(user);
      return this.createAuthResponse(savedUser);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        'code' in error.driverError &&
        error.driverError.code === 'ER_DUP_ENTRY'
      ) {
        throw new ConflictException(
          'El correo o la identificación ya están registrados',
        );
      }
      throw error;
    }
  }

  async login(input: unknown) {
    const { email, password } = this.validateCredentials(input);
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();

    if (!user || !(await compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    if (user.estado === UserStatus.BLOCKED) {
      throw new UnauthorizedException('La cuenta está bloqueada');
    }

    return this.createAuthResponse(user);
  }

  async findAuthenticatedUser(id: number): Promise<AuthenticatedUser | null> {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: {
        id: true,
        identificacion: true,
        nombres: true,
        apellidos: true,
        email: true,
        role: true,
        estado: true,
      },
    });
    return user
      ? {
          id: user.id,
          identificacion: user.identificacion,
          nombres: user.nombres,
          apellidos: user.apellidos,
          email: user.email,
          role: user.role,
          estado: user.estado,
        }
      : null;
  }

  private validateCredentials(input: unknown): Credentials {
    if (typeof input !== 'object' || input === null) {
      throw new BadRequestException('Se requieren correo y contraseña');
    }

    const body = input as Record<string, unknown>;
    if (
      typeof body.email !== 'string' ||
      typeof body.password !== 'string' ||
      body.email.trim().length > 255 ||
      !EMAIL_PATTERN.test(body.email.trim()) ||
      body.password.length < 8 ||
      Buffer.byteLength(body.password, 'utf8') > 72
    ) {
      throw new BadRequestException(
        'El correo debe ser válido y la contraseña debe tener entre 8 y 72 bytes',
      );
    }

    return {
      email: body.email.trim().toLowerCase(),
      password: body.password,
    };
  }

  private async createAuthResponse(user: User) {
    const accessToken = await this.jwtService.signAsync({ sub: user.id });
    return {
      accessToken,
      user: {
        id: user.id,
        identificacion: user.identificacion,
        nombres: user.nombres,
        apellidos: user.apellidos,
        email: user.email,
        role: user.role,
        estado: user.estado,
      },
    };
  }
}
