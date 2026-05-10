import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ConsultationStatus } from '../common/enums/consultation-status.enum';

@Entity('consultations')
export class ConsultationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  roomId: string;

  @Column()
  doctorId: number;

  @Column({ type: 'uuid', nullable: true })
  patientId: string | null;

  @Column({
    type: 'enum',
    enum: ConsultationStatus,
    default: ConsultationStatus.SCHEDULED,
  })
  status: ConsultationStatus;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
