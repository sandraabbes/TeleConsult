import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { RendezvousStatus } from '../rendezvous-status.enum';
import { RendezvousType } from '../rendezvous-type.enum';

@Entity()
@Index(['medecinId', 'startTime'], { unique: true })
export class Rendezvous {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  medecinId: number;

  @Column({ type: 'varchar', nullable: true })
  patientId: string;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
  endTime: Date;

  @Column({
    type: 'enum',
    enum: RendezvousStatus,
    default: RendezvousStatus.SCHEDULED, 
  })
  status: RendezvousStatus;

  @Column({
    type: 'enum',
    enum: RendezvousType,
    default: RendezvousType.STANDARD, 
  })
  type: RendezvousType;

  @Column({ type: 'boolean', default: false })
  doctorInWaitingRoom: boolean;

  @Column({ type: 'timestamp', nullable: true })
  doctorJoinedWaitingRoomAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  consultationStartedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  consultationEndedAt: Date | null;

  @Column({ type: 'boolean', default: false })
  patientInWaitingRoom: boolean;

  @Column({ type: 'timestamp', nullable: true })
  patientJoinedWaitingRoomAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  proposedStartTime: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  proposedEndTime: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  rescheduleRequestedAt: Date | null;
}
