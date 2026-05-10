import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsDateString, IsOptional, IsString, IsEnum } from 'class-validator';
import { RendezvousStatus } from '../../entities/rendezvous-status.enum';
import { RendezvousType } from 'src/rendezvous/entities/rendezvous-type.enum';

export class UpdateRendezvousDto {
  @ApiProperty({
    description: 'Nouvelle date et heure de début (si modification)',
    example: '2023-01-01T15:00:00Z',
    required: false,
    type: String,
    format: 'date-time'
  })
  @IsDateString()
  @IsOptional()
  startTime?: Date;

  @ApiProperty({
    description: 'Nouvelle date et heure de fin (si modification)',
    example: '2023-01-01T15:30:00Z',
    required: false,
    type: String,
    format: 'date-time'
  })
  @IsDateString()
  @IsOptional()
  endTime?: Date;

  @ApiProperty({
    description: 'Statut du rendez-vous',
    enum: RendezvousStatus,
    example: 'confirmed',
    required: false
  })
  @IsEnum(RendezvousStatus)
  @IsOptional()
  status?: RendezvousStatus;

 @ApiProperty({
    description: 'Type du rendez-vous',
    enum: RendezvousType,
    example: 'followup',
    required: false
  })
  @IsEnum(RendezvousType)
  @IsOptional()
  type?: RendezvousType;



  @ApiProperty({
    description: 'ID du nouveau médecin (si transfert)',
    example: 2,
    required: false,
    type: Number
  })
  @IsNumber()
  @IsOptional()
  newMedecinId?: number;
}