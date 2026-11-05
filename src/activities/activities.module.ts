import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { User } from '../users/user.entity';
import { ActivitiesController } from './activities.controller';
import { Activity } from './activity.entity';
import { ActivitiesService } from './activities.service';

@Module({
  imports: [TypeOrmModule.forFeature([Activity, User]), AuthModule],
  controllers: [ActivitiesController],
  providers: [ActivitiesService, JwtAuthGuard, RolesGuard],
})
export class ActivitiesModule {}
