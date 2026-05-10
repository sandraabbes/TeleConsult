import { IsString, IsOptional } from 'class-validator';

export class JoinWaitingRoomDto {
  @IsString()
  roomId: string;

  @IsString()
  consultationId: string;

  @IsOptional()
  @IsString()
  patientId?: string;

  @IsOptional()
  @IsString()
  patientName?: string;
}
