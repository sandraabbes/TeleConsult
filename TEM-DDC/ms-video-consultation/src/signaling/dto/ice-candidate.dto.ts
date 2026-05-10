import { IsString, IsObject } from 'class-validator';

export class IceCandidateDto {
  @IsString()
  roomId: string;

  @IsString()
  targetUserId: string;

  @IsObject()
  candidate: RTCIceCandidateInit;
}
