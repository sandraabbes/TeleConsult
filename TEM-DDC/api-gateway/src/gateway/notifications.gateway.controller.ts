import {
  Controller,
  Get,
  Patch,
  Param,
  Req,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { JwtPatientOrDoctorGuard } from '../common/guards/jwt-patient-or-doctor.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

interface JwtUser {
  sub?: string;
  doctorId?: string;
}

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtPatientOrDoctorGuard)
export class NotificationsGatewayController {
  private readonly notificationsClient: ClientProxy;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('NOTIFICATIONS_SERVICE_HOST') || 'localhost';
    const portRaw = this.config.get<string | number>('NOTIFICATIONS_SERVICE_PORT');
    const port = typeof portRaw === 'number' ? portRaw : parseInt(String(portRaw || '4005'), 10);
    this.notificationsClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: { host, port },
    });
  }

  private getUserIdAndType(req: any): { userId: string; userType: 'DOCTOR' | 'PATIENT' } {
    const user = req.user as JwtUser;
    if (!user) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    if (user.doctorId) {
      return { userId: String(user.doctorId), userType: 'DOCTOR' };
    }
    if (user.sub) {
      return { userId: String(user.sub), userType: 'PATIENT' };
    }
    throw new HttpException('Invalid user context', HttpStatus.UNAUTHORIZED);
  }

  @Get()
  @ApiOperation({ summary: 'Get all notifications for the current user' })
  async getNotifications(@Req() req: any) {
    try {
      const { userId, userType } = this.getUserIdAndType(req);
      return firstValueFrom(
        this.notificationsClient.send('get_notifications', { userId, userType }),
      );
    } catch (e: any) {
      throw new HttpException(
        e?.message || 'Failed to fetch notifications',
        e?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notifications count' })
  async getUnreadCount(@Req() req: any) {
    try {
      const { userId, userType } = this.getUserIdAndType(req);
      return firstValueFrom(
        this.notificationsClient.send('get_unread_count', { userId, userType }),
      );
    } catch (e: any) {
      throw new HttpException(
        e?.message || 'Failed to fetch unread count',
        e?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Req() req: any) {
    try {
      const { userId, userType } = this.getUserIdAndType(req);
      return firstValueFrom(
        this.notificationsClient.send('mark_all_as_read', { userId, userType }),
      );
    } catch (e: any) {
      throw new HttpException(
        e?.message || 'Failed to mark all as read',
        e?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(@Param('id') id: string) {
    try {
      return firstValueFrom(
        this.notificationsClient.send('mark_as_read', { notificationId: id }),
      );
    } catch (e: any) {
      throw new HttpException(
        e?.message || 'Failed to mark notification as read',
        e?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
