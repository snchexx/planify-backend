import {
  BadRequestException,
  NotFoundException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import {
  getMessaging,
  type Messaging,
  type MulticastMessage,
} from 'firebase-admin/messaging';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { User } from '../users/user.entity';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { NotificationDevice } from './notification-device.entity';

@Injectable()
export class NotificationsService {
  private readonly messaging: Messaging;

  constructor(
    @InjectRepository(NotificationDevice)
    private readonly devicesRepository: Repository<NotificationDevice>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    configService: ConfigService,
  ) {
    const projectId = configService.getOrThrow<string>('FIREBASE_PROJECT_ID');
    const app =
      getApps().find((firebaseApp) => firebaseApp.name === 'planify') ??
      initializeApp({ credential: applicationDefault(), projectId }, 'planify');
    this.messaging = getMessaging(app);
  }

  async registerDevice(
    requester: AuthenticatedUser,
    dto: RegisterDeviceDto,
  ): Promise<void> {
    const user = await this.usersRepository.findOneBy({ id: requester.id });
    if (!user) {
      throw new NotFoundException('No se encontró el usuario autenticado');
    }

    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const device =
      (await this.devicesRepository.findOneBy({ tokenHash })) ??
      this.devicesRepository.create();
    device.token = dto.token;
    device.tokenHash = tokenHash;
    device.platform = dto.platform;
    device.user = user;
    await this.devicesRepository.save(device);
  }

  async sendTestNotification(
    requester: AuthenticatedUser,
  ): Promise<{ sent: number; failed: number }> {
    return this.sendToUser(requester.id, {
      notification: {
        title: 'Planify',
        body: '¡Las notificaciones están funcionando!',
      },
      data: { type: 'test' },
      android: { priority: 'high' },
    });
  }

  async sendActivityReminder(
    userId: number,
    activityId: number,
    activityName: string,
  ): Promise<void> {
    await this.sendToUser(userId, {
      notification: {
        title: 'Recordatorio de actividad',
        body: `La actividad "${activityName}" está por comenzar.`,
      },
      data: {
        type: 'activity_reminder',
        activityId: String(activityId),
      },
      android: { priority: 'high' },
    });
  }

  private async sendToUser(
    userId: number,
    message: Omit<MulticastMessage, 'tokens'>,
  ): Promise<{ sent: number; failed: number }> {
    const devices = await this.devicesRepository.find({
      where: { user: { id: userId } },
    });
    if (devices.length === 0) {
      throw new BadRequestException(
        'El usuario no tiene un dispositivo registrado para notificaciones',
      );
    }

    const response = await this.messaging.sendEachForMulticast({
      ...message,
      tokens: devices.map((device) => device.token),
    });

    const invalidDevices = devices.filter((_, index) => {
      const code = response.responses[index].error?.code;
      return (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      );
    });
    if (invalidDevices.length > 0) {
      await this.devicesRepository.remove(invalidDevices);
    }

    if (response.successCount === 0) {
      const errorCodes = [
        ...new Set(
          response.responses
            .map((item) => item.error?.code)
            .filter((code): code is string => Boolean(code)),
        ),
      ];
      throw new ServiceUnavailableException(
        `Firebase no pudo enviar la notificación de prueba${
          errorCodes.length > 0 ? ` (${errorCodes.join(', ')})` : ''
        }`,
      );
    }

    return {
      sent: response.successCount,
      failed: response.failureCount,
    };
  }
}
