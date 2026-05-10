import { IsString, IsOptional } from 'class-validator';

export class EndConsultationDto {
  @IsString()
  roomId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
