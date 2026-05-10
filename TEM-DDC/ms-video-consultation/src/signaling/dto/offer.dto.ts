import { IsString, IsObject } from 'class-validator';

export class OfferDto {
  @IsString()
  roomId: string;

  @IsString()
  targetUserId: string;

  @IsObject()
  offer: RTCSessionDescriptionInit;
}
