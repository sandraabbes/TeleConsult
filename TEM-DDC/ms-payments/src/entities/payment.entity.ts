import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentStatus } from './payment-status.enum';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int', nullable: false })
  rendezvousId!: number;

  @Column({ type: 'uuid', nullable: false })
  patientId!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  amount!: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status!: PaymentStatus;

  @Column({ type: 'varchar', nullable: true })
  konnectPaymentRef?: string | null;

  @Column({ type: 'text', nullable: true })
  konnectPayUrl?: string | null;

  @Column({ type: 'varchar', length: 4, nullable: true })
  cardLastFour?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}

