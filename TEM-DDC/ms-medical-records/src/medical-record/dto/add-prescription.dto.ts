import { IsString, IsNotEmpty, IsUUID } from 'class-validator';
import { PrescriptionInputDto } from '../../prescription/dto/prescription-input.dto';

export class AddPrescriptionDto extends PrescriptionInputDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  recordId: string;
}
