import { IsNumber } from 'class-validator';

export class GetPaymentByRendezvousDto {
  @IsNumber()
  rendezvousId: number;
}

