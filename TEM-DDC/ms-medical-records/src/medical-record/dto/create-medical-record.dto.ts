import {
  IsString,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  IsUUID,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PrescriptionInputDto } from '../../prescription/dto/prescription-input.dto';

export class CreateMedicalRecordDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  patientId: string;

  @IsNumber()
  @IsNotEmpty()
  doctorId: number;

  @IsNumber()
  @IsNotEmpty()
  rendezvousId: number;

  @IsDateString()
  @IsNotEmpty()
  consultationDate: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  diagnosis?: string;

  @IsArray()
  @IsOptional()
  attachments?: Record<string, any>[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionInputDto)
  @IsOptional()
  prescriptions?: PrescriptionInputDto[];
}
