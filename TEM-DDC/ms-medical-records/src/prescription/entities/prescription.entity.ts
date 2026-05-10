import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MedicalRecordEntity } from '../../medical-record/entities/medical-record.entity';

@Entity('prescriptions')
export class PrescriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MedicalRecordEntity, (mr) => mr.prescriptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'medicalRecordId' })
  medicalRecord: MedicalRecordEntity;

  @Column()
  medicalRecordId: string;

  @Column({ type: 'varchar' })
  medicationName: string;

  @Column({ type: 'varchar' })
  dosage: string;

  @Column({ type: 'varchar' })
  frequency: string;

  @Column({ type: 'varchar' })
  duration: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
