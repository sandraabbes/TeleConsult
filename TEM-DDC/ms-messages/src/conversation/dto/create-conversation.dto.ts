import { IsString } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  doctorId: string;

  @IsString()
  patientId: string;
}
