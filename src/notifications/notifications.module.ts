import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../users/user.entity';
import { Activity } from '../activities/activity.entity';
import { Reminder } from '../reminders/reminder.entity';
import { NotificationDevice } from './notification-device.entity';
import { NotificationsController } from './notifications.controller';
import { ReminderSchedulerService } from './reminder-scheduler.service';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationDevice, Reminder, Activity, User]),
    AuthModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, ReminderSchedulerService, JwtAuthGuard],
})
export class NotificationsModule {}
