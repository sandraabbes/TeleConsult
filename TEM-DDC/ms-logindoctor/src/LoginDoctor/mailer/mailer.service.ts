// src/mailer/mailer.service.ts
import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class CustomMailerService {
  constructor(private readonly mailerService: MailerService) {}

  async sendMail(to: string, subject: string, text: string) {
    return this.mailerService.sendMail({
      to,
      subject,
      text,
    });
  }

  async sendVerificationCode(email: string, code: string) {
    return this.sendMail(email, 'Votre code de vérification', `Votre code est : ${code}`);
  }

  async sendPasswordResetCode(email: string, code: string) {
    return this.sendMail(email, 'Réinitialisation du mot de passe', `Votre code de réinitialisation est : ${code}`);
  }
}
