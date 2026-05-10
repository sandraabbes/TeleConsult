import { IsNotEmpty, IsUUID } from 'class-validator';

export class InitiatePaymentDto {
  @IsUUID()
  @IsNotEmpty()
  paymentId: string;
}
