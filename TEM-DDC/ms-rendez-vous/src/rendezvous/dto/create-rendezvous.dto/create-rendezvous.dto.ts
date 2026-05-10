import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsDateString, IsNotEmpty, IsEnum, IsOptional, IsString } from 'class-validator';
import { RendezvousType } from 'src/rendezvous/entities/rendezvous-type.enum';

export class CreateRendezvousDto {
  @ApiProperty({
    description: 'ID du médecin',
    example: 1,
    required: true,
    type: Number
  })
  @IsNumber()
  @IsNotEmpty()
  medecinId: number;

  @ApiProperty({
    description: 'ID du patient',
    example: 1,
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({
    description: 'Nom du patient (pour notifications)',
    required: false,
  })
  @IsOptional()
  @IsString()
  patientName?: string;

  @ApiProperty({
    description: 'Date et heure de début du rendez-vous (format ISO 8601)',
    example: '2023-01-01T14:00:00Z',
    required: true,
    type: String,
    format: 'date-time'
  })
  @IsDateString()
  @IsNotEmpty()
  startTime: Date;



  @ApiProperty({
    description: 'Date et heure de fin du rendez-vous (format ISO 8601)',
    example: '2023-01-01T14:30:00Z',
    required: true,
    type: String,
    format: 'date-time'
  })
  @IsDateString()
  @IsNotEmpty()
  endTime: Date;


   @ApiProperty({
    description: 'Type of the appointment',
    example: RendezvousType.STANDARD,
    enum: RendezvousType,
    required: true,
    type: String,
  })
  @IsEnum(RendezvousType)
  @IsNotEmpty()
  type: RendezvousType;
  //type must be one of the following values: followup, homevisit, standard
}