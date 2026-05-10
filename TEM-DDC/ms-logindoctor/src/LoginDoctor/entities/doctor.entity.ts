import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum VerificationStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

@Entity('doctors')
export class Doctor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  fullName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  phone: string;

  @Column()
  password: string;

  @Column()
  specialty: string;

  @Column('int')
  experience: number;

  @Column()
  practicePlace: string;

  @Column()
  country: string;

  @Column()
  city: string;

  @Column()
  clinicAddress: string;

  @Column()
  licenceImg: string;

  @Column()
  identityImg: string;

  @Column({ type: 'varchar', default: 'doctor' })
  role: string;

  /** ✅ Profile Additional Details */
  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 50.00 })
  consultationPrice: number;

  @Column({ type: 'text', nullable: true })
  profilePhotoUrl: string;

  /** ✅ Verification */
  @Column({
    type: 'varchar',
    default: VerificationStatus.PENDING_REVIEW,
  })
  verificationStatus: VerificationStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  /** ✅ Champs pour 2FA */
  @Column({ type: 'varchar', nullable: true })
  twoFactorCode: string | null;

  @Column({ type: 'timestamp', nullable: true })
  twoFactorCodeExpires: Date | null;

  /** ✅ Reset password */
  @Column({ type: 'varchar', nullable: true })
  resetCode: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resetCodeExpires: Date | null;

  /** ✅ Appareils de confiance */
  @Column({ type: 'json', nullable: true, default: '[]' })
  trustedDevices: { ip: string; userAgent: string }[];
}