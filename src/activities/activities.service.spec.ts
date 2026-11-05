import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { Role } from '../users/role.enum';
import { UserStatus } from '../users/user-status.enum';
import { User } from '../users/user.entity';
import { Activity } from './activity.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { ActivitiesService } from './activities.service';

describe('ActivitiesService', () => {
  const queryBuilder = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
  };
  const activitiesRepository = {
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
  };
  const usersRepository = { findOneBy: jest.fn() };
  let service: ActivitiesService;

  const user: AuthenticatedUser = {
    id: 8,
    identificacion: 'id-8',
    nombres: 'Usuario',
    apellidos: 'Prueba',
    email: 'user@example.com',
    role: Role.USER,
    estado: UserStatus.ACTIVE,
  };
  const admin: AuthenticatedUser = { ...user, id: 1, role: Role.ADMIN };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ActivitiesService(
      activitiesRepository as unknown as Repository<Activity>,
      usersRepository as unknown as Repository<User>,
    );
    activitiesRepository.create.mockImplementation((activity) => activity);
  });

  it('associates a new activity with the authenticated user', async () => {
    usersRepository.findOneBy.mockResolvedValue({ id: user.id });
    activitiesRepository.save.mockImplementation(async (activity) => ({
      ...activity,
      idActividad: 22,
    }));

    const result = await service.create(
      {
        nombreActividad: 'Planificar',
        descripcion: 'Plan semanal',
        fechaActividad: '2026-11-12',
        horaActividad: '14:30',
      } as CreateActivityDto,
      user,
    );

    expect(activitiesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ usuario: { id: user.id } }),
    );
    expect(result.idUsuario).toBe(user.id);
  });

  it('prevents a regular user from assigning an activity to another user', async () => {
    await expect(
      service.create(
        {
          nombreActividad: 'Planificar',
          descripcion: 'Plan semanal',
          fechaActividad: '2026-11-12',
          horaActividad: '14:30',
          idUsuario: 55,
        } as CreateActivityDto,
        user,
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(usersRepository.findOneBy).not.toHaveBeenCalled();
  });

  it('allows admins to assign activities to existing users', async () => {
    usersRepository.findOneBy.mockResolvedValue({ id: 55 });
    activitiesRepository.save.mockImplementation(async (activity) => ({
      ...activity,
      idActividad: 23,
    }));

    const result = await service.create(
      {
        nombreActividad: 'Planificar',
        descripcion: 'Plan semanal',
        fechaActividad: '2026-11-12',
        horaActividad: '14:30',
        idUsuario: 55,
      } as CreateActivityDto,
      admin,
    );

    expect(result.idUsuario).toBe(55);
  });

  it('returns only the authenticated user activities when listing', async () => {
    queryBuilder.getMany.mockResolvedValue([
      {
        idActividad: 22,
        nombreActividad: 'Planificar',
        descripcion: 'Plan semanal',
        fechaActividad: '2026-11-12',
        horaActividad: '14:30',
        usuario: { id: user.id },
      },
    ]);

    const result = await service.findAll(user);

    expect(queryBuilder.andWhere).toHaveBeenCalledWith('user.id = :userId', {
      userId: user.id,
    });
    expect(result).toHaveLength(1);
    expect(result[0].idUsuario).toBe(user.id);
  });

  it('does not restrict admin activity listings to one owner', async () => {
    queryBuilder.getMany.mockResolvedValue([]);

    await service.findAll(admin);

    expect(queryBuilder.andWhere).not.toHaveBeenCalled();
  });

  it('hides another user activity as not found', async () => {
    queryBuilder.getOne.mockResolvedValue(null);

    await expect(service.findOne(44, user)).rejects.toThrow(NotFoundException);
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('user.id = :userId', {
      userId: user.id,
    });
  });
});
