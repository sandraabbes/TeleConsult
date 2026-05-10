import { IsString, IsUUID } from 'class-validator';

export class JoinConsultationDto {
  @IsString()
  roomId: string;

  @IsString()
  @IsUUID()
  patientId: string;
}
