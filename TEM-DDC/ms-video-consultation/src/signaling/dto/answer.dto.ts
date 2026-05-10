import { IsString, IsObject } from 'class-validator';

export class AnswerDto {
  @IsString()
  roomId: string;

  @IsString()
  targetUserId: string;

  @IsObject()
  answer: RTCSessionDescriptionInit;
}
