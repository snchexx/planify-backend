import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { Role } from '../users/role.enum';
import { User } from '../users/user.entity';
import { Reminder } from '../reminders/reminder.entity';
import { localDateTimeToUtc } from '../reminders/reminder-time';
import { Activity } from './activity.entity';
import { ActivityResponseDto } from './dto/activity-response.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { ReminderOffset } from './reminder-offset.enum';

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(Activity)
    private readonly activitiesRepository: Repository<Activity>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(
    dto: CreateActivityDto,
    requester: AuthenticatedUser,
  ): Promise<ActivityResponseDto> {
    this.validateReminderConfiguration(
      dto.recordatorioHabilitado ?? null,
      dto.recordatorioMinutosAntes ?? null,
    );
    const user = await this.resolveTargetUser(dto.idUsuario, requester);
    const reminderDateTime =
      dto.recordatorioHabilitado === false
        ? null
        : this.getReminderDateTime(
            dto.fechaActividad,
            dto.horaActividad,
            dto.recordatorioHabilitado === true
              ? dto.recordatorioMinutosAntes
              : null,
          );
    const activity = this.activitiesRepository.create({
      nombreActividad: dto.nombreActividad,
      descripcion: dto.descripcion ?? '',
      fechaActividad: dto.fechaActividad,
      horaActividad: dto.horaActividad,
      categoria: dto.categoria ?? null,
      prioridad: dto.prioridad ?? null,
      recordatorioHabilitado: dto.recordatorioHabilitado ?? null,
      recordatorioMinutosAntes: dto.recordatorioMinutosAntes ?? null,
      usuario: user,
      recordatorios: reminderDateTime ? [reminderDateTime] : [],
    });

    return this.toResponse(
      await this.activitiesRepository.save(activity),
      user.id,
    );
  }

  async findAll(requester: AuthenticatedUser): Promise<ActivityResponseDto[]> {
    const query = this.activitiesRepository
      .createQueryBuilder('activity')
      .innerJoinAndSelect('activity.usuario', 'user')
      .orderBy('activity.idActividad', 'ASC');

    if (requester.role !== Role.ADMIN) {
      query.andWhere('user.id = :userId', { userId: requester.id });
    }

    const activities = await query.getMany();
    return activities.map((activity) => this.toResponse(activity));
  }

  async findOne(
    id: number,
    requester: AuthenticatedUser,
  ): Promise<ActivityResponseDto> {
    const activity = await this.findAccessibleActivity(id, requester);
    return this.toResponse(activity);
  }

  async update(
    id: number,
    dto: UpdateActivityDto,
    requester: AuthenticatedUser,
  ): Promise<ActivityResponseDto> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('Debe proporcionar al menos un campo');
    }

    const activity = await this.findAccessibleActivity(id, requester);
    if (dto.idUsuario !== undefined) {
      activity.usuario = await this.resolveTargetUser(dto.idUsuario, requester);
    }
    if (dto.nombreActividad !== undefined)
      activity.nombreActividad = dto.nombreActividad;
    if (dto.descripcion !== undefined) activity.descripcion = dto.descripcion;
    if (dto.fechaActividad !== undefined)
      activity.fechaActividad = dto.fechaActividad;
    if (dto.horaActividad !== undefined)
      activity.horaActividad = dto.horaActividad;
    if (dto.categoria !== undefined) activity.categoria = dto.categoria;
    if (dto.prioridad !== undefined) activity.prioridad = dto.prioridad;
    if (
      dto.recordatorioHabilitado !== undefined ||
      dto.recordatorioMinutosAntes !== undefined
    ) {
      const recordatorioHabilitado =
        dto.recordatorioHabilitado ?? activity.recordatorioHabilitado;
      const recordatorioMinutosAntes =
        dto.recordatorioMinutosAntes ?? activity.recordatorioMinutosAntes;
      this.validateReminderConfiguration(
        recordatorioHabilitado,
        recordatorioMinutosAntes,
      );
      activity.recordatorioHabilitado = recordatorioHabilitado;
      activity.recordatorioMinutosAntes = recordatorioMinutosAntes;
    }

    const shouldRefreshReminder =
      dto.fechaActividad !== undefined ||
      dto.horaActividad !== undefined ||
      dto.recordatorioHabilitado !== undefined ||
      dto.recordatorioMinutosAntes !== undefined;
    const savedActivity = await this.activitiesRepository.manager.transaction(
      async (manager) => {
        const saved = await manager.save(activity);
        if (!shouldRefreshReminder) {
          return saved;
        }

        await manager.delete(Reminder, {
          actividad: { idActividad: activity.idActividad },
        });
        if (saved.recordatorioHabilitado !== false) {
          const reminderDateTime = this.getReminderDateTime(
            saved.fechaActividad,
            saved.horaActividad,
            saved.recordatorioHabilitado === true
              ? saved.recordatorioMinutosAntes
              : null,
          );
          await manager.save(Reminder, {
            ...reminderDateTime,
            actividad: saved,
          });
        }
        return saved;
      },
    );
    return this.toResponse(savedActivity, activity.usuario.id);
  }

  async remove(id: number, requester: AuthenticatedUser): Promise<void> {
    const activity = await this.findAccessibleActivity(id, requester);
    await this.activitiesRepository.remove(activity);
  }

  private async findAccessibleActivity(
    id: number,
    requester: AuthenticatedUser,
  ): Promise<Activity> {
    const query = this.activitiesRepository
      .createQueryBuilder('activity')
      .innerJoinAndSelect('activity.usuario', 'user')
      .where('activity.idActividad = :id', { id });

    if (requester.role !== Role.ADMIN) {
      query.andWhere('user.id = :userId', { userId: requester.id });
    }

    const activity = await query.getOne();
    if (!activity) {
      throw new NotFoundException('Actividad no encontrada');
    }
    return activity;
  }

  private async resolveTargetUser(
    requestedUserId: number | undefined,
    requester: AuthenticatedUser,
  ): Promise<User> {
    let userId = requester.id;
    if (requester.role !== Role.ADMIN) {
      if (requestedUserId !== undefined) {
        throw new ForbiddenException(
          'Solo un administrador puede asignar actividades a otros usuarios',
        );
      }
    } else {
      userId = requestedUserId ?? requester.id;
    }

    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('Usuario asignado no encontrado');
    }
    return user;
  }

  private toResponse(
    activity: Activity,
    fallbackUserId?: number,
  ): ActivityResponseDto {
    const userId = activity.usuario?.id ?? fallbackUserId;
    if (userId === undefined) {
      throw new Error('No fue posible resolver el usuario de la actividad');
    }

    return {
      idActividad: activity.idActividad,
      nombreActividad: activity.nombreActividad,
      descripcion: activity.descripcion,
      fechaActividad: activity.fechaActividad,
      horaActividad: activity.horaActividad,
      categoria: activity.categoria ?? null,
      prioridad: activity.prioridad ?? null,
      recordatorioHabilitado: activity.recordatorioHabilitado ?? null,
      recordatorioMinutosAntes: activity.recordatorioMinutosAntes ?? null,
      idUsuario: userId,
    };
  }

  private validateReminderConfiguration(
    enabled: boolean | null,
    minutesBefore: ReminderOffset | null,
  ): void {
    if (enabled === true && minutesBefore === null) {
      throw new BadRequestException(
        'Debe seleccionar cuántos minutos antes recibir el recordatorio',
      );
    }
  }

  private getReminderDateTime(
    date: string,
    time: string,
    minutesBefore: ReminderOffset | null | undefined,
  ): {
    fechaRecordatorio: string;
    horaRecordatorio: string;
    scheduledAtUtc: Date;
  } {
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    const reminderDate = new Date(
      Date.UTC(year, month - 1, day, hour, minute - (minutesBefore ?? 0)),
    ).toISOString();

    const fechaRecordatorio = reminderDate.slice(0, 10);
    const horaRecordatorio = reminderDate.slice(11, 16);
    return {
      fechaRecordatorio,
      horaRecordatorio,
      scheduledAtUtc: localDateTimeToUtc(fechaRecordatorio, horaRecordatorio),
    };
  }
}
