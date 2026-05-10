import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from './entities/doctor.entity';
import { LoginDto } from './dto/login.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RequestResetDto } from './dto/request-reset.dto';
import { ResendCodeDto } from './dto/resend-code.dto';
import { DoctorResponseDto } from './dto/doctor-response.dto';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { CustomMailerService } from './mailer/mailer.service';
import type { Request } from 'express';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
    private readonly jwtService: JwtService,
    private readonly mailService: CustomMailerService,
  ) {}

  /** ========== HELPER : SANITIZE DOCTOR ========== */
  private sanitizeDoctor(doctor: Doctor): DoctorResponseDto {
    return {
      id: doctor.id,
      fullName: doctor.fullName,
      email: doctor.email,
      phone: doctor.phone,
      specialty: doctor.specialty,
      experience: doctor.experience,
      practicePlace: doctor.practicePlace,
      country: doctor.country,
      city: doctor.city,
      clinicAddress: doctor.clinicAddress,
      licenceImg: doctor.licenceImg,
      identityImg: doctor.identityImg,
      role: doctor.role,
    };
  }

  /** ========== LOGIN AVEC 2FA ========== */
  async login(dto: LoginDto, req: Request) {
    const doctor = await this.doctorRepository.findOne({ where: { email: dto.email.toLowerCase() } });
    if (!doctor) throw new UnauthorizedException('Email non trouvé');

    const valid = await bcrypt.compare(dto.password, doctor.password);
    if (!valid) throw new UnauthorizedException('Mot de passe incorrect');

    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const trusted = doctor.trustedDevices?.some(
      (device) => device.ip === ip && device.userAgent === userAgent,
    );

    if (trusted) {
      const { accessToken, refreshToken } = await this.generateTokens(doctor);
      return {
        message: 'Connexion réussie (2FA non nécessaire)',
        accessToken,
        refreshToken,
        doctor: this.sanitizeDoctor(doctor),
      };
    }

    // Générer code 2FA
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000);

    doctor.twoFactorCode = code;
    doctor.twoFactorCodeExpires = expires;
    await this.doctorRepository.save(doctor);

    await this.mailService.sendVerificationCode(doctor.email, code);

    return {
      message: 'Un code de vérification a été envoyé à votre adresse email.',
      doctorId: doctor.id,
      email: doctor.email,
      codeSent: true,
    };
  }

  /** ========== VÉRIFICATION DU CODE 2FA ========== */
  async verifyCode(dto: VerifyCodeDto, req: Request) {
    const doctor = await this.doctorRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (!doctor || !doctor.twoFactorCode || !doctor.twoFactorCodeExpires) {
      throw new UnauthorizedException('Code invalide ou expiré');
    }

    if (doctor.twoFactorCodeExpires < new Date()) {
      throw new UnauthorizedException('Code expiré');
    }

    if (doctor.twoFactorCode.trim() !== dto.code.trim()) {
      throw new UnauthorizedException('Code incorrect');
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    doctor.trustedDevices = doctor.trustedDevices || [];
    const alreadyTrusted = doctor.trustedDevices.some(
      (device) => device.ip === ip && device.userAgent === userAgent,
    );

    if (!alreadyTrusted) {
      doctor.trustedDevices.push({
        ip: ip?.toString() || 'unknown',
        userAgent: userAgent?.toString() || 'unknown',
      });
    }

    doctor.twoFactorCode = null;
    doctor.twoFactorCodeExpires = null;
    await this.doctorRepository.save(doctor);

    const { accessToken, refreshToken } = await this.generateTokens(doctor);

    return {
      accessToken,
      refreshToken,
      doctor: this.sanitizeDoctor(doctor),
    };
  }

  /** ========== GÉNÉRATION DES TOKENS JWT ========== */
async generateTokens(doctor: Partial<Doctor>) {
  const payload = { 
    sub: doctor.id, 
    email: doctor.email, 
    role: doctor.role || 'doctor',
    // ❌ REMOVE aud and iss from payload - use options instead
  };
  
  const accessToken = this.jwtService.sign(payload, { 
    expiresIn: '2h',
    issuer: 'https://auth.doctor.svc',
    audience: 'gateway',  // ✅ Set in options only
  });
  
  const refreshToken = this.jwtService.sign(payload, { 
    expiresIn: '7d',
    issuer: 'https://auth.doctor.svc',
    audience: 'gateway',  // ✅ Set in options only
  });
  
  return { accessToken, refreshToken };
}

  /** ========== DEMANDE DE RÉINITIALISATION ========== */
  async requestReset(dto: RequestResetDto) {
    const doctor = await this.doctorRepository.findOne({ where: { email: dto.email.toLowerCase() } });
    if (!doctor) {
      return { message: 'Si votre email existe, vous recevrez un code sous peu.' };
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const resetExpires = new Date(Date.now() + 30 * 60 * 1000);

    doctor.resetCode = code;
    doctor.resetCodeExpires = resetExpires;
    await this.doctorRepository.save(doctor);

    await this.mailService.sendPasswordResetCode(doctor.email, code);

    return { message: 'Si votre email existe, vous recevrez un code sous peu.' };
  }

  /** ========== RÉINITIALISATION DU MOT DE PASSE ========== */
  async resetPassword(dto: ResetPasswordDto) {
    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException('Les mots de passe ne correspondent pas');
    }

    const doctor = await this.doctorRepository.findOne({ where: { email: dto.email.toLowerCase() } });
    if (!doctor) throw new NotFoundException('Compte introuvable');

    if (!doctor.resetCode || doctor.resetCode !== dto.code) {
      throw new UnauthorizedException('Code invalide');
    }

    if (!doctor.resetCodeExpires || doctor.resetCodeExpires < new Date()) {
      throw new UnauthorizedException('Code expiré');
    }

    doctor.password = await bcrypt.hash(dto.newPassword, 10);
    doctor.resetCode = null;
    doctor.resetCodeExpires = null;
    await this.doctorRepository.save(doctor);

    return { message: 'Mot de passe réinitialisé avec succès' };
  }

  /** ========== RÉENVOI DU CODE 2FA ========== */
  async resendCode(dto: ResendCodeDto) {
    const doctor = await this.doctorRepository.findOne({ where: { email: dto.email.toLowerCase() } });
    if (!doctor) throw new NotFoundException('Email introuvable');

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000);

    doctor.twoFactorCode = code;
    doctor.twoFactorCodeExpires = expires;
    await this.doctorRepository.save(doctor);

    await this.mailService.sendVerificationCode(doctor.email, code);

    return { message: 'Un nouveau code a été envoyé par email.' };
  }

  /** ========== LOGOUT ========== */
  async logout(doctorId: number) {
    const doctor = await this.doctorRepository.findOne({ where: { id: doctorId } });
    if (doctor) {
      doctor.trustedDevices = [];
      await this.doctorRepository.save(doctor);
    }
    return { message: 'Déconnexion réussie' };
  }
}
