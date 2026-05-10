import { IsUUID, IsNotEmpty } from 'class-validator';

export class MarkAsReadDto {
  @IsUUID()
  @IsNotEmpty()
  notificationId: string;
}
