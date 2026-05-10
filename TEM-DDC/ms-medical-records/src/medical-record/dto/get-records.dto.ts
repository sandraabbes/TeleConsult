import { IsString, IsNumber, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class GetRecordsByPatientDto {
  @IsString()
  @IsUUID()
  patientId: string;
}

export class GetRecordsByDoctorDto {
  @IsNumber()
  @Type(() => Number)
  doctorId: number;
}

export class GetRecordByIdDto {
  @IsString()
  @IsUUID()
  recordId: string;
}
