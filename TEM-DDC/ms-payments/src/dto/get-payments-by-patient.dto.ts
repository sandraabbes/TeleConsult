import { IsUUID } from 'class-validator';

export class GetPaymentsByPatientDto {
  @IsUUID()
  patientId: string;
}

