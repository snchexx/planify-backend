import { Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Reminder } from '../reminders/reminder.entity';
import { ReminderStatus } from '../reminders/reminder-status.enum';
import { NotificationsService } from './notifications.service';
import { ReminderSchedulerService } from './reminder-scheduler.service';

describe('ReminderSchedulerService', () => {
  const remindersRepository = {
    find: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
  };
  const dataSource = { query: jest.fn().mockResolvedValue([]) };
  const notificationsService = {
    sendActivityReminder: jest.fn(),
  };
  let service: ReminderSchedulerService;

  const reminder = {
    idRecordatorio: 11,
    status: ReminderStatus.PROCESSING,
    attempts: 1,
    leaseId: 'lease-11',
    actividad: {
      idActividad: 27,
      nombreActividad: 'Preparar examen',
      usuario: { id: 8 },
    },
  } as Reminder;

  beforeEach(() => {
    jest.clearAllMocks();
    dataSource.query.mockResolvedValue([]);
    remindersRepository.find.mockResolvedValue([reminder]);
    remindersRepository.update.mockResolvedValue({ affected: 1 });
    notificationsService.sendActivityReminder.mockResolvedValue(undefined);
    service = new ReminderSchedulerService(
      remindersRepository as unknown as Repository<Reminder>,
      dataSource as never,
      notificationsService as unknown as NotificationsService,
    );
  });

  it('atomically claims due reminders and marks successful sends as sent', async () => {
    await service.processDueReminders();

    expect(dataSource.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INTERVAL 15 MINUTE'),
      [
        ReminderStatus.SKIPPED,
        ReminderStatus.PENDING,
        ReminderStatus.PROCESSING,
      ],
    );
    expect(dataSource.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('LIMIT 50'),
      [
        ReminderStatus.PROCESSING,
        expect.any(String),
        ReminderStatus.PENDING,
        ReminderStatus.PROCESSING,
      ],
    );
    expect(notificationsService.sendActivityReminder).toHaveBeenCalledWith(
      8,
      27,
      'Preparar examen',
    );
    expect(remindersRepository.update).toHaveBeenCalledWith(
      { idRecordatorio: 11, leaseId: 'lease-11' },
      expect.objectContaining({
        status: ReminderStatus.SENT,
        leaseId: null,
        leaseUntilUtc: null,
      }),
    );
  });

  it('schedules a retry after a transient delivery failure', async () => {
    notificationsService.sendActivityReminder.mockRejectedValue(
      new Error('Temporary FCM outage'),
    );

    await service.processDueReminders();

    const update = remindersRepository.update.mock.calls[0][1];
    expect(update).toMatchObject({
      status: ReminderStatus.PENDING,
      lastError: 'Error',
      leaseId: null,
      leaseUntilUtc: null,
    });
    expect(update.nextAttemptAtUtc).toBeInstanceOf(Date);
    expect(update.nextAttemptAtUtc.getTime()).toBeGreaterThan(Date.now());
  });

  it('logs each time the scheduled reminder cycle is triggered', async () => {
    jest.useFakeTimers();
    remindersRepository.find.mockResolvedValue([]);
    const loggerSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation();

    try {
      await service.onModuleInit();
      expect(loggerSpy).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(15_000);

      expect(loggerSpy).toHaveBeenCalledTimes(2);
      expect(loggerSpy).toHaveBeenCalledWith(
        'Se disparó la tarea programada para enviar notificaciones',
      );
    } finally {
      service.onModuleDestroy();
      loggerSpy.mockRestore();
      jest.useRealTimers();
    }
  });
});
