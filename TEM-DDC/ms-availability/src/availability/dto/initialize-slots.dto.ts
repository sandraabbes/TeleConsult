import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsArray } from 'class-validator';

export class InitializeSlotsDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  doctorId: number;

  @ApiProperty({ example: '2025-08-30' })
  @IsString()
  date: string;

  @ApiProperty({ example: 30, required: false })
  @IsNumber()
  @IsOptional()
  slotDuration?: number;

  @ApiProperty({
    example: [{ startTime: '09:00', endTime: '12:00' }, { startTime: '14:00', endTime: '18:00' }],
    required: false,
  })
  @IsArray()
  @IsOptional()
  blocks?: { startTime: string; endTime: string }[];
}
