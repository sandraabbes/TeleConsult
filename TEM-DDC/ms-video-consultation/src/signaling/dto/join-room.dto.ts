import { IsString, IsOptional } from 'class-validator';

export class JoinRoomDto {
  @IsString()
  roomId: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  role?: 'doctor' | 'patient';
}
