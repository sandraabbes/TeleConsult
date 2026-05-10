import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsDate, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAvailabilityDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  doctorId: number;

  @ApiProperty({ example: '2025-08-28T09:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  startTime: Date;

  @ApiProperty({ example: '2025-08-28T09:30:00.000Z' })
  @Type(() => Date)
  @IsDate()
  endTime: Date;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean = true;
}
