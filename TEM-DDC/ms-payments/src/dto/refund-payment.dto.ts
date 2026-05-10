import { IsNotEmpty, IsUUID } from 'class-validator';

export class RefundPaymentDto {
  @IsUUID()
  @IsNotEmpty()
  paymentId: string;
}

