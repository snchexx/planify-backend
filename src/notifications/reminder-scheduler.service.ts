import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Activity } from '../activities/activity.entity';
import { Reminder } from '../reminders/reminder.entity';
import { ReminderStatus } from '../reminders/reminder-status.enum';
import { localDateTimeToUtc } from '../reminders/reminder-time';
import { NotificationsService } from './notifications.service';

const POLL_INTERVAL_MS = 15_000;
const CLAIM_LEASE_SECONDS = 120;
const MAX_LATE_MINUTES = 15;
const MAX_ATTEMPTS = 5;
const MAX_BATCH_SIZE = 50;

@Injectable()
export class ReminderSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReminderSchedulerService.name);
  private interval: NodeJS.Timeout | undefined;
  private isProcessing = false;

  constructor(
    @InjectRepository(Reminder)
    private readonly remindersRepository: Repository<Reminder>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.backfillMissingSchedules();
    await this.runSafely();
    this.interval = setInterval(() => {
      void this.runSafely();
    }, POLL_INTERVAL_MS);
    this.interval.unref();
  }

  onModuleDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  async processDueReminders(): Promise<void> {
    if (this.isProcessing) {
      return;
    }
    this.isProcessing = true;

    try {
      await this.skipExpiredReminders();
      const leaseId = randomUUID();
      await this.claimDueReminders(leaseId);
      const reminders = await this.remindersRepository.find({
        where: { leaseId, status: ReminderStatus.PROCESSING },
        relations: { actividad: { usuario: true } },
        order: { scheduledAtUtc: 'ASC' },
      });

      for (const reminder of reminders) {
        await this.sendReminder(reminder);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async backfillMissingSchedules(): Promise<void> {
    while (true) {
      const reminders = await this.remindersRepository.find({
        where: {
          scheduledAtUtc: IsNull(),
          status: ReminderStatus.PENDING,
        },
        relations: { actividad: true },
        order: { idRecordatorio: 'ASC' },
        take: MAX_BATCH_SIZE,
      });
      if (reminders.length === 0) {
        return;
      }

      for (const reminder of reminders) {
        reminder.scheduledAtUtc = localDateTimeToUtc(
          reminder.fechaRecordatorio,
          reminder.horaRecordatorio,
        );
        await this.remindersRepository.save(reminder);
      }
    }
  }

  private async skipExpiredReminders(): Promise<void> {
    await this.dataSource.query(
      `UPDATE \`recordatorios\`
       SET \`estado_envio\` = ?, \`lease_id\` = NULL, \`lease_until_utc\` = NULL,
           \`last_error\` = 'Recordatorio vencido; se omitió'
       WHERE \`scheduled_at_utc\` IS NOT NULL
         AND \`scheduled_at_utc\` < DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${MAX_LATE_MINUTES} MINUTE)
         AND (
           \`estado_envio\` = ?
           OR (
             \`estado_envio\` = ?
             AND (\`lease_until_utc\` IS NULL OR \`lease_until_utc\` <= UTC_TIMESTAMP())
           )
         )`,
      [
        ReminderStatus.SKIPPED,
        ReminderStatus.PENDING,
        ReminderStatus.PROCESSING,
      ],
    );
  }

  private async claimDueReminders(leaseId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE \`recordatorios\`
       SET \`estado_envio\` = ?, \`lease_id\` = ?,
           \`lease_until_utc\` = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ${CLAIM_LEASE_SECONDS} SECOND),
           \`intentos_envio\` = \`intentos_envio\` + 1, \`last_error\` = NULL
       WHERE \`scheduled_at_utc\` IS NOT NULL
         AND \`scheduled_at_utc\` <= UTC_TIMESTAMP()
         AND \`scheduled_at_utc\` >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${MAX_LATE_MINUTES} MINUTE)
         AND (\`next_attempt_at_utc\` IS NULL OR \`next_attempt_at_utc\` <= UTC_TIMESTAMP())
         AND (
           \`estado_envio\` = ?
           OR (
             \`estado_envio\` = ?
             AND (\`lease_until_utc\` IS NULL OR \`lease_until_utc\` <= UTC_TIMESTAMP())
           )
         )
       ORDER BY \`scheduled_at_utc\` ASC
       LIMIT ${MAX_BATCH_SIZE}`,
      [
        ReminderStatus.PROCESSING,
        leaseId,
        ReminderStatus.PENDING,
        ReminderStatus.PROCESSING,
      ],
    );
  }

  private async sendReminder(reminder: Reminder): Promise<void> {
    const leaseId = reminder.leaseId;
    if (!leaseId) {
      this.logger.error(
        `El recordatorio ${reminder.idRecordatorio} no tiene un lease activo`,
      );
      return;
    }

    try {
      const activity: Activity | undefined = reminder.actividad;
      if (!activity?.usuario) {
        throw new Error('La actividad o su usuario no están disponibles');
      }

      await this.notificationsService.sendActivityReminder(
        activity.usuario.id,
        activity.idActividad,
        activity.nombreActividad,
      );
      await this.remindersRepository.update(
        {
          idRecordatorio: reminder.idRecordatorio,
          leaseId,
        },
        {
          status: ReminderStatus.SENT,
          sentAtUtc: new Date(),
          leaseId: null,
          leaseUntilUtc: null,
          nextAttemptAtUtc: null,
          lastError: null,
        },
      );
    } catch (error) {
      await this.recordFailure(reminder, leaseId, error);
    }
  }

  private async recordFailure(
    reminder: Reminder,
    leaseId: string,
    error: unknown,
  ): Promise<void> {
    const failed = reminder.attempts >= MAX_ATTEMPTS;
    const retryDelayMs = Math.min(
      30_000 * 2 ** Math.max(reminder.attempts - 1, 0),
      5 * 60_000,
    );
    const failureCode = this.getFailureCode(error);
    await this.remindersRepository.update(
      {
        idRecordatorio: reminder.idRecordatorio,
        leaseId,
      },
      {
        status: failed ? ReminderStatus.FAILED : ReminderStatus.PENDING,
        nextAttemptAtUtc: failed ? null : new Date(Date.now() + retryDelayMs),
        leaseId: null,
        leaseUntilUtc: null,
        lastError: failureCode,
      },
    );
    this.logger.warn(
      `No se pudo enviar el recordatorio ${reminder.idRecordatorio} (${failureCode}); intento ${reminder.attempts}/${MAX_ATTEMPTS}`,
    );
  }

  private getFailureCode(error: unknown): string {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'string'
    ) {
      return error.code.slice(0, 200);
    }
    return error instanceof Error ? error.name.slice(0, 200) : 'UnknownError';
  }

  private async runSafely(): Promise<void> {
    this.logger.log(
      'Se disparó la tarea programada para enviar notificaciones',
    );
    try {
      await this.processDueReminders();
    } catch (error) {
      this.logger.error(
        'Falló el ciclo de programación de recordatorios',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
