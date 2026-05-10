import { IsString, IsEnum, IsNotEmpty, MaxLength } from 'class-validator';
import { UserType } from '../entities/user-type.enum';
import { NotificationType } from '../entities/notification-type.enum';

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  userId: string;

  @IsEnum(UserType)
  @IsNotEmpty()
  userType: UserType;

  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @IsString()
  @IsNotEmpty()
  message: string;
}
