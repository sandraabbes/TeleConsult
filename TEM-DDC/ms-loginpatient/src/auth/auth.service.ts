import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { MailService } from './mail/mail.service';
import { Request } from 'express';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  /** ========== LOGIN AVEC 2FA CONDITONNEL ========== */
  async login(loginDto: LoginDto, request: Request) {
    const { email, password } = loginDto;
    this.logger.log(`🔐 Tentative de login pour : ${email}`);

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      this.logger.warn(`❌ Aucun utilisateur trouvé pour : ${email}`);
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(`❌ Mot de passe incorrect pour : ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const ip = request.ip || request.headers['x-forwarded-for'] || request.connection.remoteAddress;
    const userAgent = request.headers['user-agent'];

    const trusted = user.trustedDevices?.some(
      (device) => device.ip === ip && device.userAgent === userAgent,
    );

    if (trusted) {
      const accessToken = await this.generateJwtToken(user);
      return {
        message: 'Connexion réussie (2FA non nécessaire)',
        accessToken,
        user,
      };
    }

    // 🔐 Générer un code 2FA
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    user.twoFactorCode = code;
    user.twoFactorCodeExpires = expires;
    await this.userRepository.save(user);

    await this.mailService.sendTwoFactorCode(user.email, user.firstName, code);

    return {
      message: 'Un code de vérification a été envoyé à votre adresse email.',
      userId: user.id,
    };
  }

  /** ========== VÉRIFICATION DU CODE 2FA + ENREGISTREMENT DEVICE ========== */
  async verifyTwoFactorCode(userId: string, code: string, request: Request) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.twoFactorCode || !user.twoFactorCodeExpires) {
      throw new UnauthorizedException('Code invalide ou expiré');
    }

    if (user.twoFactorCodeExpires < new Date()) {
      throw new UnauthorizedException('Code expiré');
    }

    if (user.twoFactorCode !== code) {
      throw new UnauthorizedException('Code incorrect');
    }

    const ip = request.ip || request.headers['x-forwarded-for'] || request.connection.remoteAddress;
    const userAgent = request.headers['user-agent'];

    user.trustedDevices = user.trustedDevices || [];
    const alreadyTrusted = user.trustedDevices.some(
      (device) => device.ip === ip && device.userAgent === userAgent,
    );

    if (!alreadyTrusted) {
      user.trustedDevices.push({
        ip: ip?.toString() || 'unknown',
        userAgent: userAgent?.toString() || 'unknown',
      });
    }

    user.twoFactorCode = '';
    user.twoFactorCodeExpires = null;
    await this.userRepository.save(user);

    const accessToken = await this.generateJwtToken(user);
    return { accessToken, user };
  }

  /** ========== JWT TOKEN GENERATOR ========== */
  async generateJwtToken(user: Partial<User>): Promise<string> {
    const payload = {
    sub: user.id,      // ✅ plus standard
    email: user.email,
    name: user.firstName || user['name'],
    role: user.role || 'user',
};

    return this.jwtService.sign(payload);
  }

  /** ========== JWT VERIFY (depuis cookie) ========== */
  async verifyToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (err) {
      throw new UnauthorizedException('Token invalide ou expiré');
    }
  }

  /** ========== OAUTH USER CREATION ========== */
  async validateOrCreateOAuthUser(oauthPayload: {
    email: string;
    name: string;
    providerId: string;
    provider?: string;
  }): Promise<User> {
    try {
      const { email, name, providerId, provider } = oauthPayload;

      let user = await this.userRepository.findOne({ where: { email } });

      if (!user) {
        user = this.userRepository.create({
          email,
          firstName: name,
          lastName: '',
          password: '',
          provider: provider || '',
          providerId,
          role: 'user',
          acceptPrivacyPolicy: true,
          birthdate: new Date(),
          gender: 'not_specified',
        });

        await this.userRepository.save(user);
        this.logger.log(`👤 New user created via ${provider}: ${email}`);
      }

      return user;
    } catch (error) {
      this.logger.error(`❌ OAuth user creation failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('OAuth login failed');
    }
  }

  /** ========== VALIDATION EMAIL SIMPLE ========== */
  async validateUser(email: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({ where: { email } });
    } catch (error) {
      this.logger.error(`❌ User validation failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur validation email');
    }
  }

  /** ========== ENVOI CODE RÉINITIALISATION ========== */
  async sendResetCode(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.validateUser(email);
      if (!user) {
        return {
          success: true,
          message: 'Si votre email existe, vous recevrez un code sous peu.',
        };
      }

      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      const resetCodeExpires = new Date(Date.now() + 30 * 60 * 1000);

      user.resetCode = resetCode;
      user.resetCodeExpires = resetCodeExpires;
      await this.userRepository.save(user);

      await this.mailService.sendPasswordResetCode(email, resetCode, resetCodeExpires, user.firstName);

      return {
        success: true,
        message: 'Si votre email existe, vous recevrez un code sous peu.',
      };
    } catch (error) {
      this.logger.error(`❌ Failed to send reset code: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur envoi du code');
    }
  }

  /** ========== VÉRIFICATION CODE RESET ========== */
  async verifyResetCode(email: string, resetCode: string): Promise<{ valid: boolean; message: string }> {
    try {
      const user = await this.userRepository.findOne({ where: { email } });

      if (!user || !user.resetCode || !user.resetCodeExpires) {
        return { valid: false, message: 'Code invalide ou expiré' };
      }

      if (user.resetCodeExpires < new Date()) {
        return { valid: false, message: 'Code expiré' };
      }

      if (user.resetCode !== resetCode) {
        return { valid: false, message: 'Code incorrect' };
      }

      return { valid: true, message: '✅ Code correct' };
    } catch (error) {
      this.logger.error(`❌ Error verifying reset code: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur vérification code');
    }
  }

  /** ========== RÉINITIALISATION DU MOT DE PASSE ========== */
  async resetPassword(
    email: string,
    resetCode: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (newPassword !== confirmPassword) {
        throw new UnauthorizedException('Les mots de passe ne correspondent pas');
      }

      const user = await this.userRepository.findOne({ where: { email } });

      if (!user || user.resetCode !== resetCode || user.resetCodeExpires < new Date()) {
        return { success: false, message: 'Code invalide ou expiré' };
      }

      user.password = await bcrypt.hash(newPassword, 10);
      user.resetCode = '';
      user.resetCodeExpires = new Date(0);
      await this.userRepository.save(user);

      this.logger.log(`✅ Password reset done for ${email}`);
      return { success: true, message: 'Mot de passe réinitialisé avec succès' };
    } catch (error) {
      this.logger.error(`❌ Error resetting password: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur réinitialisation mot de passe');
    }
  }

  /** ========== ENVOI EMAIL DE BIENVENUE ========== */
  async sendWelcomeEmail(to: string, firstName: string): Promise<void> {
    try {
      await this.mailService.sendWelcomeEmail(to, firstName);
    } catch (error) {
      this.logger.error(`❌ Failed to send welcome email to ${to}`, error.stack);
      throw new InternalServerErrorException('Erreur envoi email de bienvenue');
    }
  }

  /** ========== RENVoyer le CODE 2FA ========== */
  async resendTwoFactorCode(userId: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const newExpiry = new Date(Date.now() + 5 * 60 * 1000);

    user.twoFactorCode = newCode;
    user.twoFactorCodeExpires = newExpiry;
    await this.userRepository.save(user);

    await this.mailService.sendTwoFactorCode(user.email, user.firstName, newCode);

    this.logger.log(`📨 Nouveau code 2FA renvoyé à ${user.email}`);

    return { message: 'Un nouveau code 2FA a été envoyé par email.' };
  }
}
