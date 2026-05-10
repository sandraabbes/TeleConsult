import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class PrescriptionInputDto {
  @IsString()
  @IsNotEmpty()
  medicationName: string;

  @IsString()
  @IsNotEmpty()
  dosage: string;

  @IsString()
  @IsNotEmpty()
  frequency: string;

  @IsString()
  @IsNotEmpty()
  duration: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
