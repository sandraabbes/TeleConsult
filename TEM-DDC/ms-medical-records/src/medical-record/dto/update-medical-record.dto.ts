import { IsString, IsOptional, IsArray, IsNotEmpty, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PrescriptionInputDto } from '../../prescription/dto/prescription-input.dto';

export class UpdateMedicalRecordDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  recordId: string;

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
