import { IsNotEmpty, IsNumber, IsPositive, IsUUID } from 'class-validator';

export class CreatePaymentDto {
  @IsNumber()
  @IsNotEmpty()
  rendezvousId: number;

  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  amount: number;
}

