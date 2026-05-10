import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsString, Matches } from 'class-validator';

export class CreateDisponibiliteDto {
  @ApiProperty({
    description: 'ID of the doctor',
    example: 1,
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  medecinId: number;

  @ApiProperty({
    description: 'Start time of the availability (YYYY-MM-DD HH:MM format)',
    example: '2025-07-15 09:00',
    format: 'date-time',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?(.*)?(Z)?$/, { 
    message: 'startTime must be in format: YYYY-MM-DD HH:MM or similar ISO format'
  })
  startTime: string;

  @ApiProperty({
    description: 'End time of the availability (YYYY-MM-DD HH:MM format)',
    example: '2025-07-15 12:00',
    format: 'date-time',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?(.*)?(Z)?$/, { 
    message: 'endTime must be in format: YYYY-MM-DD HH:MM or similar ISO format'
  })
  endTime: string;

  @ApiProperty({
    description: 'Whether the time slot is available',
    example: true,
    required: false,
    default: true,
  })
  @IsBoolean()
  isAvailable?: boolean = true;
}
