import { IsNumber, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateConsultationDto {

  @Type(() => Number)   
  @IsNumber()
  doctorId: number;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
