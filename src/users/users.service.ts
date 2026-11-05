import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { Role } from './role.enum';
import { UserStatus } from './user-status.enum';
import { User } from './user.entity';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const user = this.usersRepository.create({
      identificacion: dto.identificacion,
      nombres: dto.nombres,
      apellidos: dto.apellidos,
      email: dto.email,
      passwordHash: await hash(dto.password, BCRYPT_ROUNDS),
      role: dto.role ?? Role.USER,
      estado: dto.estado ?? UserStatus.ACTIVE,
    });

    try {
      return this.toResponse(await this.usersRepository.save(user));
    } catch (error) {
      this.throwIfDuplicateEmail(error);
      throw error;
    }
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.usersRepository.find({
      select: {
        id: true,
        identificacion: true,
        nombres: true,
        apellidos: true,
        email: true,
        role: true,
        estado: true,
        createdAt: true,
      },
      order: { id: 'ASC' },
    });
    return users.map((user) => this.toResponse(user));
  }

  async findOne(id: number): Promise<UserResponseDto> {
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
        createdAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return this.toResponse(user);
  }

  async update(id: number, dto: UpdateUserDto): Promise<UserResponseDto> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('Debe proporcionar al menos un campo');
    }

    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (dto.identificacion !== undefined)
      user.identificacion = dto.identificacion;
    if (dto.nombres !== undefined) user.nombres = dto.nombres;
    if (dto.apellidos !== undefined) user.apellidos = dto.apellidos;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.estado !== undefined) user.estado = dto.estado;
    if (dto.password !== undefined) {
      user.passwordHash = await hash(dto.password, BCRYPT_ROUNDS);
    }

    try {
      return this.toResponse(await this.usersRepository.save(user));
    } catch (error) {
      this.throwIfDuplicateEmail(error);
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException('Usuario no encontrado');
    }
  }

  private toResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      identificacion: user.identificacion,
      nombres: user.nombres,
      apellidos: user.apellidos,
      email: user.email,
      role: user.role,
      estado: user.estado,
      createdAt: user.createdAt,
    };
  }

  private throwIfDuplicateEmail(error: unknown): void {
    if (
      error instanceof QueryFailedError &&
      'code' in error.driverError &&
      error.driverError.code === 'ER_DUP_ENTRY'
    ) {
      throw new ConflictException(
        'El correo o la identificación ya están registrados',
      );
    }
  }
}
