import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('devices')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Registrar o actualizar un dispositivo FCM' })
  @ApiNoContentResponse()
  registerDevice(
    @CurrentUser() requester: AuthenticatedUser,
    @Body() dto: RegisterDeviceDto,
  ): Promise<void> {
    return this.notificationsService.registerDevice(requester, dto);
  }

  @Post('test')
  @ApiOperation({ summary: 'Enviar una notificación FCM de prueba al usuario' })
  @ApiOkResponse()
  sendTest(
    @CurrentUser() requester: AuthenticatedUser,
  ): Promise<{ sent: number; failed: number }> {
    return this.notificationsService.sendTestNotification(requester);
  }
}
