import { IsString, IsOptional, IsNotEmpty, IsArray, ValidateNested  } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';


class SlotDto {
  @IsString()
  @ApiProperty({ example: '09:00' })
  start: string;

  @IsString()
  @ApiProperty({ example: '10:00' })
  end: string;
}

export class CreateDisponibiliteDto {

  @ApiProperty({ example: '6637bfc9b72e65a3f0d74e22' })
  @IsString()
  @IsNotEmpty()
  doctorId: string;

  @ApiProperty({ example: '2025-05-12' })
  @IsString()
  @IsOptional()
  date?: Date;

  @ApiProperty()
  @IsString()
  @IsOptional()
  day?: string;

  // readonly slots: {
  //   start: string; // format: "HH:mm"
  //   end: string;   // format: "HH:mm"
  //   }[];
  
  @ApiProperty({
    description: 'Liste des créneaux disponibles',
    type: [SlotDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SlotDto)
  slots: SlotDto[];

  }
