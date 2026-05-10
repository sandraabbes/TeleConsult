import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class DeletePrescriptionDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  prescriptionId: string;
}
