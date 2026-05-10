import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { PrescriptionEntity } from '../../prescription/entities/prescription.entity';

@Entity('medical_records')
export class MedicalRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  patientId: string;

  @Column({ type: 'int' })
  doctorId: number;

  @Column({ type: 'int' })
  rendezvousId: number;

  @Column({ type: 'timestamp' })
  consultationDate: Date;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'text', nullable: true })
  diagnosis: string | null;

  @Column({ type: 'jsonb', nullable: true })
  attachments: Record<string, any>[] | null;

  @OneToMany(() => PrescriptionEntity, (p) => p.medicalRecord, { cascade: true })
  prescriptions: PrescriptionEntity[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
