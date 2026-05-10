import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class MarkDayDto {
  @ApiProperty({ example: '2025-09-01' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;
}
