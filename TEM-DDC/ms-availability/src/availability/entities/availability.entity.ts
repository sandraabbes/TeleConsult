import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('availabilities')
export class Availability {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  doctorId: number;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
  endTime: Date;

  @Column({ default: true })
  isAvailable: boolean;
}
