import { IsString, IsEnum, MaxLength } from 'class-validator';
import { SenderType } from '../entities/message.entity';

export class SendMessageDto {
  @IsString()
  conversationId: string;

  @IsString()
  senderId: string;

  @IsEnum(SenderType)
  senderType: SenderType;

  @IsString()
  @MaxLength(2000)
  text: string;
}
