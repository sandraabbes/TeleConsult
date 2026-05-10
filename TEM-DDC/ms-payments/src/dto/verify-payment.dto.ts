import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyPaymentDto {
  @IsString()
  @IsNotEmpty()
  paymentRef: string;
}
