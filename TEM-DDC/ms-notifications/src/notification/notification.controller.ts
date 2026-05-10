import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { GetNotificationsDto } from './dto/get-notifications.dto';
import { GetUnreadCountDto } from './dto/get-unread-count.dto';
import { MarkAsReadDto } from './dto/mark-as-read.dto';
import { MarkAllAsReadDto } from './dto/mark-all-as-read.dto';

@Controller()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @MessagePattern('create_notification')
  async createNotification(@Payload() dto: CreateNotificationDto) {
    return this.notificationService.create(dto);
  }

  @MessagePattern('get_notifications')
  async getNotifications(@Payload() dto: GetNotificationsDto) {
    return this.notificationService.getNotifications(dto.userId, dto.userType);
  }

  @MessagePattern('get_unread_count')
  async getUnreadCount(@Payload() dto: GetUnreadCountDto) {
    return this.notificationService.getUnreadCount(dto.userId, dto.userType);
  }

  @MessagePattern('mark_as_read')
  async markAsRead(@Payload() dto: MarkAsReadDto) {
    return this.notificationService.markAsRead(dto.notificationId);
  }

  @MessagePattern('mark_all_as_read')
  async markAllAsRead(@Payload() dto: MarkAllAsReadDto) {
    return this.notificationService.markAllAsRead(dto.userId, dto.userType);
  }
}
