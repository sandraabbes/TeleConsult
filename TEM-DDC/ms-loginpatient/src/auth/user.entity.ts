import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  IsEmail,
  IsNotEmpty,
  Length,
  Matches,
  IsBoolean,
  IsString,
  IsOptional,
} from 'class-validator';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @Column()
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @Column({ type: 'date' })
  @IsNotEmpty()
  birthdate: Date;

  @Column({ type: 'varchar' })
  @IsNotEmpty()
  gender: string;

  @Column({ unique: true })
  @IsEmail()
  email: string;

  @Column({ unique: true, default: '99999' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @Column()
  @IsNotEmpty()
  @Length(8, 32)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message: 'Password too weak',
  })
  password: string;

  @Column({ type: 'varchar', default: 'patient' })
  @IsNotEmpty()
  role: string;

  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  acceptPrivacyPolicy: boolean;
  
  @Column({ unique: true, nullable: true }) 
  @IsString()
  identifier: string; 

  /** 🔒 Réinitialisation mot de passe */
  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  resetCode: string;

  @Column({ nullable: true })
  @IsOptional()
  resetCodeExpires: Date;

  /** ✅ Champs pour login Google/Facebook/LinkedIn */
  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  provider: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  providerId: string;

  /** ✅ Champs pour 2FA */
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  twoFactorCode: string | null;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  twoFactorCodeExpires: Date | null;

  /** ✅ Appareils de confiance */
  @Column({ type: 'json', nullable: true, default: [] })
  trustedDevices: { ip: string; userAgent: string }[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
