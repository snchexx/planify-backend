import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ActivityPriority } from '../activity-priority.enum';
import { CreateActivityDto } from './create-activity.dto';
import { ReminderOffset } from '../reminder-offset.enum';

describe('Activity DTO validation', () => {
  const validationPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  it('accepts a calendar date and 24-hour time', async () => {
    const result = await validationPipe.transform(
      {
        nombreActividad: ' Reunión ',
        descripcion: ' Revisar la agenda ',
        fechaActividad: '2026-11-12',
        horaActividad: '14:30',
      },
      { type: 'body', metatype: CreateActivityDto },
    );

    expect(result).toMatchObject({
      nombreActividad: 'Reunión',
      descripcion: 'Revisar la agenda',
      fechaActividad: '2026-11-12',
      horaActividad: '14:30',
    });
  });

  it('accepts an omitted optional description', async () => {
    const result = await validationPipe.transform(
      {
        nombreActividad: 'Planificar',
        fechaActividad: '2026-11-12',
        horaActividad: '14:30',
      },
      { type: 'body', metatype: CreateActivityDto },
    );

    expect(result.descripcion).toBeUndefined();
  });

  it('rejects invalid date and time formats', async () => {
    await expect(
      validationPipe.transform(
        {
          nombreActividad: 'Reunión',
          descripcion: 'Revisar la agenda',
          fechaActividad: '12/11/2026',
          horaActividad: '25:70',
        },
        { type: 'body', metatype: CreateActivityDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('accepts custom categories and supported priority and reminder options', async () => {
    const result = await validationPipe.transform(
      {
        nombreActividad: 'Repasar',
        descripcion: 'Unidad 1',
        fechaActividad: '2026-11-12',
        horaActividad: '14:30',
        categoria: 'Examen de ciencias',
        prioridad: ActivityPriority.HIGH,
        recordatorioHabilitado: true,
        recordatorioMinutosAntes: ReminderOffset.MINUTES_25,
      },
      { type: 'body', metatype: CreateActivityDto },
    );

    expect(result).toMatchObject({
      categoria: 'Examen de ciencias',
      prioridad: ActivityPriority.HIGH,
      recordatorioHabilitado: true,
      recordatorioMinutosAntes: ReminderOffset.MINUTES_25,
    });
  });

  it('rejects unsupported priorities and reminder offsets', async () => {
    await expect(
      validationPipe.transform(
        {
          nombreActividad: 'Repasar',
          descripcion: 'Unidad 1',
          fechaActividad: '2026-11-12',
          horaActividad: '14:30',
          prioridad: 'Urgente',
          recordatorioMinutosAntes: 20,
        },
        { type: 'body', metatype: CreateActivityDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects an owner id supplied by a non-admin through unknown fields', async () => {
    await expect(
      validationPipe.transform(
        {
          nombreActividad: 'Reunión',
          descripcion: 'Revisar la agenda',
          fechaActividad: '2026-11-12',
          horaActividad: '14:30',
          ownerId: 99,
        },
        { type: 'body', metatype: CreateActivityDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
