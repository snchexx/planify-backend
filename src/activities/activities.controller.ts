import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ActivitiesService } from './activities.service';
import { ActivityResponseDto } from './dto/activity-response.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@ApiTags('activities')
@ApiBearerAuth()
@Controller('activities')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una actividad para el usuario autenticado' })
  @ApiCreatedResponse({ type: ActivityResponseDto })
  create(
    @Body() dto: CreateActivityDto,
    @CurrentUser() requester: AuthenticatedUser,
  ): Promise<ActivityResponseDto> {
    return this.activitiesService.create(dto, requester);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar actividades propias; admin puede listar todas',
  })
  @ApiOkResponse({ type: ActivityResponseDto, isArray: true })
  findAll(
    @CurrentUser() requester: AuthenticatedUser,
  ): Promise<ActivityResponseDto[]> {
    return this.activitiesService.findAll(requester);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una actividad propia o administrada' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: ActivityResponseDto })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() requester: AuthenticatedUser,
  ): Promise<ActivityResponseDto> {
    return this.activitiesService.findOne(id, requester);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una actividad propia o administrada' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: ActivityResponseDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateActivityDto,
    @CurrentUser() requester: AuthenticatedUser,
  ): Promise<ActivityResponseDto> {
    return this.activitiesService.update(id, dto, requester);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una actividad propia o administrada' })
  @ApiParam({ name: 'id', type: Number })
  @ApiNoContentResponse()
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() requester: AuthenticatedUser,
  ): Promise<void> {
    return this.activitiesService.remove(id, requester);
  }
}
