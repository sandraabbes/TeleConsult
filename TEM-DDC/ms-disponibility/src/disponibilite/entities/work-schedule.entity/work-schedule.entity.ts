/* eslint-disable prettier/prettier */
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class WorkScheduleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column()
  medecinId: number;

  @ApiProperty({ example: 1, description: 'Jour de la semaine (0 = Dimanche, 6 = Samedi)' })
  @Column()
  dayOfWeek: number;

  @ApiProperty({ example: '09:00' })
  @Column()
  startTime: string;

  @ApiProperty({ example: '17:00' })
  @Column()
  endTime: string;

  @ApiProperty({ example: 30 })
  @Column({ default: 30 })
  slotDuration: number;
}
