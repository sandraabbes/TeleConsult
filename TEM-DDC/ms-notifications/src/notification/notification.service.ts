import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity } from './entities/notification.entity';
import { UserType } from './entities/user-type.enum';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepo: Repository<NotificationEntity>,
  ) {}

  async create(dto: CreateNotificationDto): Promise<NotificationEntity> {
    const entity = this.notificationRepo.create({
      userId: dto.userId,
      userType: dto.userType,
      type: dto.type,
      message: dto.message,
      isRead: false,
    });
    return this.notificationRepo.save(entity);
  }

  async getNotifications(
    userId: string,
    userType: UserType,
  ): Promise<NotificationEntity[]> {
    return this.notificationRepo.find({
      where: { userId, userType },
      order: { createdAt: 'DESC' },
    });
  }

  async getUnreadCount(userId: string, userType: UserType): Promise<number> {
    return this.notificationRepo.count({
      where: { userId, userType, isRead: false },
    });
  }

  async markAsRead(notificationId: string): Promise<NotificationEntity> {
    const entity = await this.notificationRepo.findOne({
      where: { id: notificationId },
    });
    if (!entity) {
      throw new NotFoundException(`Notification ${notificationId} not found`);
    }
    entity.isRead = true;
    return this.notificationRepo.save(entity);
  }

  async markAllAsRead(
    userId: string,
    userType: UserType,
  ): Promise<{ affected: number }> {
    const result = await this.notificationRepo.update(
      { userId, userType, isRead: false },
      { isRead: true },
    );
    return { affected: result.affected ?? 0 };
  }
}
