import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersController } from './users.controller';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { RespuestaIa } from '../solicitudes-ia/respuesta-ia.entity';
import { SolicitudIa } from '../solicitudes-ia/solicitud-ia.entity';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, SolicitudIa, RespuestaIa]),
    AuthModule,
  ],
  controllers: [UsersController],
  providers: [JwtAuthGuard, RolesGuard, UsersService],
  exports: [TypeOrmModule],
})
export class UsersModule {}
