import { IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class GetRecordByRendezvousDto {
  @IsNumber()
  @Type(() => Number)
  rendezvousId: number;
}
