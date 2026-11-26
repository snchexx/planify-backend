import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { Role } from '../users/role.enum';
import { UserStatus } from '../users/user-status.enum';
import { User } from '../users/user.entity';
import { Reminder } from '../reminders/reminder.entity';
import { Activity } from './activity.entity';
import { ActivityPriority } from './activity-priority.enum';
import { CreateActivityDto } from './dto/create-activity.dto';
import { ActivitiesService } from './activities.service';
import { ReminderOffset } from './reminder-offset.enum';

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
    manager: { transaction: jest.fn() },
  };
  const transactionManager = {
    save: jest.fn(
      async (target: unknown, entity?: unknown) => entity ?? target,
    ),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
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
    activitiesRepository.manager.transaction.mockImplementation(
      async (callback) => callback(transactionManager),
    );
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
      expect.objectContaining({
        usuario: { id: user.id },
        recordatorios: [
          {
            fechaRecordatorio: '2026-11-12',
            horaRecordatorio: '14:30',
            scheduledAtUtc: new Date('2026-11-12T19:30:00.000Z'),
          },
        ],
      }),
    );
    expect(result.idUsuario).toBe(user.id);
  });

  it('persists custom category, priority, and reminder settings', async () => {
    usersRepository.findOneBy.mockResolvedValue({ id: user.id });
    activitiesRepository.save.mockImplementation(async (activity) => ({
      ...activity,
      idActividad: 24,
    }));

    const result = await service.create(
      {
        nombreActividad: 'Preparar examen',
        descripcion: 'Repasar apuntes',
        fechaActividad: '2026-11-12',
        horaActividad: '14:30',
        categoria: 'Examen de ciencias',
        prioridad: ActivityPriority.HIGH,
        recordatorioHabilitado: true,
        recordatorioMinutosAntes: ReminderOffset.MINUTES_25,
      },
      user,
    );

    expect(activitiesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        categoria: 'Examen de ciencias',
        prioridad: ActivityPriority.HIGH,
        recordatorioHabilitado: true,
        recordatorioMinutosAntes: ReminderOffset.MINUTES_25,
      }),
    );
    expect(result).toMatchObject({
      categoria: 'Examen de ciencias',
      prioridad: ActivityPriority.HIGH,
      recordatorioHabilitado: true,
      recordatorioMinutosAntes: ReminderOffset.MINUTES_25,
    });
  });

  it('schedules the reminder at the selected interval before the activity', async () => {
    usersRepository.findOneBy.mockResolvedValue({ id: user.id });
    activitiesRepository.save.mockImplementation(async (activity) => ({
      ...activity,
      idActividad: 25,
    }));

    await service.create(
      {
        nombreActividad: 'Preparar examen',
        descripcion: '',
        fechaActividad: '2026-11-12',
        horaActividad: '00:10',
        recordatorioHabilitado: true,
        recordatorioMinutosAntes: ReminderOffset.MINUTES_15,
      } as CreateActivityDto,
      user,
    );

    expect(activitiesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        recordatorios: [
          {
            fechaRecordatorio: '2026-11-11',
            horaRecordatorio: '23:55',
            scheduledAtUtc: new Date('2026-11-12T04:55:00.000Z'),
          },
        ],
      }),
    );
  });

  it('does not create a reminder row when notifications are disabled', async () => {
    usersRepository.findOneBy.mockResolvedValue({ id: user.id });
    activitiesRepository.save.mockImplementation(async (activity) => ({
      ...activity,
      idActividad: 26,
    }));

    await service.create(
      {
        nombreActividad: 'Leer',
        descripcion: '',
        fechaActividad: '2026-11-12',
        horaActividad: '14:30',
        recordatorioHabilitado: false,
        recordatorioMinutosAntes: ReminderOffset.MINUTES_15,
      } as CreateActivityDto,
      user,
    );

    expect(activitiesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ recordatorios: [] }),
    );
  });

  it('requires a reminder interval when notifications are enabled', async () => {
    await expect(
      service.create(
        {
          nombreActividad: 'Preparar examen',
          descripcion: 'Repasar apuntes',
          fechaActividad: '2026-11-12',
          horaActividad: '14:30',
          recordatorioHabilitado: true,
        } as CreateActivityDto,
        user,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(usersRepository.findOneBy).not.toHaveBeenCalled();
  });

  it('updates activity category, priority, and reminder options', async () => {
    const activity = {
      idActividad: 24,
      nombreActividad: 'Preparar examen',
      descripcion: 'Repasar apuntes',
      fechaActividad: '2026-11-12',
      horaActividad: '14:30',
      categoria: null,
      prioridad: null,
      recordatorioHabilitado: null,
      recordatorioMinutosAntes: null,
      usuario: { id: user.id },
    };
    queryBuilder.getOne.mockResolvedValue(activity);
    const result = await service.update(
      activity.idActividad,
      {
        categoria: 'Proyecto personal',
        prioridad: ActivityPriority.LOW,
        recordatorioHabilitado: true,
        recordatorioMinutosAntes: ReminderOffset.MINUTES_60,
      },
      user,
    );

    expect(transactionManager.save).toHaveBeenCalledWith(
      expect.objectContaining({
        categoria: 'Proyecto personal',
        prioridad: ActivityPriority.LOW,
        recordatorioHabilitado: true,
        recordatorioMinutosAntes: ReminderOffset.MINUTES_60,
      }),
    );
    expect(transactionManager.delete).toHaveBeenCalledWith(Reminder, {
      actividad: { idActividad: activity.idActividad },
    });
    expect(transactionManager.save).toHaveBeenCalledWith(
      Reminder,
      expect.objectContaining({
        fechaRecordatorio: '2026-11-12',
        horaRecordatorio: '13:30',
        scheduledAtUtc: new Date('2026-11-12T18:30:00.000Z'),
      }),
    );
    expect(result.recordatorioMinutosAntes).toBe(ReminderOffset.MINUTES_60);
  });

  it('removes pending reminders when notifications are disabled', async () => {
    const activity = {
      idActividad: 27,
      nombreActividad: 'Leer',
      descripcion: '',
      fechaActividad: '2026-11-12',
      horaActividad: '14:30',
      categoria: 'Estudio',
      prioridad: ActivityPriority.MEDIUM,
      recordatorioHabilitado: true,
      recordatorioMinutosAntes: ReminderOffset.MINUTES_15,
      usuario: { id: user.id },
    };
    queryBuilder.getOne.mockResolvedValue(activity);

    await service.update(
      activity.idActividad,
      { recordatorioHabilitado: false },
      user,
    );

    expect(transactionManager.delete).toHaveBeenCalledWith(Reminder, {
      actividad: { idActividad: activity.idActividad },
    });
    expect(
      transactionManager.save.mock.calls.some(([, reminder]) => reminder),
    ).toBe(false);
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
