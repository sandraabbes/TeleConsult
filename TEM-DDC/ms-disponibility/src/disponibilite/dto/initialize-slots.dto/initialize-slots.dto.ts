/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional } from 'class-validator';

export class InitializeSlotsDto {
  @ApiProperty({
    description: 'ID du médecin',
    example: 1,
    type: Number,
  })
  @IsNumber()
  medecinId: number;



   @ApiProperty({ description: "Date du jour pour les créneaux (format 'YYYY-MM-DD')", example: '2025-07-18' })
  @IsString()
  date: string; // e.g. '2025-07-18'

  
  @ApiProperty({
    description: 'Durée des créneaux en minutes (défaut: 30)',
    example: 30,
    required: false,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  slotDuration?: number; 

  
}