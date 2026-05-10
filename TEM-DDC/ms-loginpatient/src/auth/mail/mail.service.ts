import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly transporter: nodemailer.Transporter;
  private readonly logger = new Logger('MailService');

  constructor(private readonly configService: ConfigService) {
    this.logger.log("🚀 Initializing Mail Service...");

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: Number(this.configService.get<number>('MAIL_PORT')),
      secure: this.configService.get<string>('MAIL_SECURE') === 'true',
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
    });

    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error(`❌ Mail service initialization failed: ${error.message}`);
      } else {
        this.logger.log('✅ Mail service is ready to send emails.');
      }
    });
  }

  /** 🔹 Méthode générique */
  async sendMail(to: string, subject: string, text: string, html?: string): Promise<void> {
    if (!to) {
      this.logger.error(`❌ Error: No recipient email defined`);
      throw new InternalServerErrorException('No recipient email defined');
    }

    this.logger.log(`📨 Sending email to: ${to}`);

    try {
      const info = await this.transporter.sendMail({
        from: this.configService.get<string>('MAIL_FROM'),
        to,
        subject,
        text,
        html,
      });

      this.logger.log(`✅ Email sent successfully to ${to}. Message ID: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`❌ Error sending email: ${error.message}`);
      throw new InternalServerErrorException('Failed to send email');
    }
  }

  /** 🔹 Email de réinitialisation de mot de passe */
  async sendPasswordResetCode(to: string, resetCode: string, expiresAt: Date, firstName: string): Promise<void> {
    if (!to) {
      this.logger.error(`❌ Error: No recipient email defined`);
      throw new InternalServerErrorException('No recipient email defined');
    }

    this.logger.log(`📧 Preparing password reset email for: ${to}`);

    const appName = this.configService.get<string>('APP_NAME') || 'Our Application';
    const expiresInMinutes = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60));
    const formattedExpiry = expiresAt.toLocaleString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const subject = `Password Reset Code for ${appName}`;
    const text = `
Hello ${firstName},

You recently requested to reset your password for your ${appName} account. 
Use the verification code below to complete the process:

Reset Code: ${resetCode}

This code will expire in ${expiresInMinutes} minutes (at ${formattedExpiry}).

If you did not request a password reset, please ignore this email or contact support.

Thank you,
The ${appName} Team
`.trim();

    const html = `
<!DOCTYPE html>
<html>
<head> 
  <meta charset="UTF-8">
  <title>Password Reset</title>
  <style>
  
    body { font-family: Arial, sans-serif; color: #333; }
    .code { font-size: 24px; font-weight: bold; color: #2c7be5; }
    .expiry { color: #e63946; font-weight: bold; }
  </style>
</head>
<body>
  <h2>Password Reset Request</h2>
  <p>Hello ${firstName},</p>
  <p>You recently requested to reset your password for your ${appName} account.</p>
  <p>Use the verification code below:</p>
  <div class="code">${resetCode}</div>
  <p>This code will expire in <span class="expiry">${expiresInMinutes} minutes</span> (at ${formattedExpiry}).</p>
  <p>If you did not request a password reset, please ignore this email.</p>
  <p>Thank you,<br>The ${appName} Team</p>
</body>
</html>
`.trim();

    await this.sendMail(to, subject, text, html);
    this.logger.log(`✅ Password reset code sent to ${to}`);
  }

  /** 🔹 Email de bienvenue avec lien vers la politique de confidentialité */
  async sendWelcomeEmail(to: string, firstName: string): Promise<void> {
    const appName = this.configService.get<string>('APP_NAME') || 'Our Application';
    const privacyPolicyUrl = 'https://yourdomain.com/privacy-policy'; // 🔗 lien de la politique

    const subject = `Welcome to ${appName}`;
    const text = `
Hello ${firstName},

Welcome to ${appName}! 🎉

Thank you for registering. We're excited to have you on board.

👉 You accepted our Privacy Policy during registration. You can review it here:
${privacyPolicyUrl}

If you have any questions, feel free to contact us.

Warm regards,  
The ${appName} Team
`.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Welcome to ${appName}</title>
</head>
<body style="font-family: Arial, sans-serif; color: #333;">
  <h2>Welcome to ${appName}, ${firstName} 🎉</h2>
  <p>Thank you for registering. We're excited to have you on board.</p>
  <p>👉 You accepted our <a href="${privacyPolicyUrl}" target="_blank">Privacy Policy</a> during registration.</p>
  <p>If you have any questions, feel free to contact us.</p>
  <p>Warm regards,<br>The ${appName} Team</p>
</body>
</html>
`.trim();

    await this.sendMail(to, subject, text, html);
    this.logger.log(`✅ Welcome email sent to ${to}`);
  }

/** 🔹 Envoi du code 2FA par email */
async sendTwoFactorCode(to: string, firstName: string, code: string): Promise<void> {
  const appName = this.configService.get<string>('APP_NAME') || 'Our Application';

  const subject = `🔐 Votre code de connexion à ${appName}`;
  const text = `
Bonjour ${firstName},

Voici votre code de vérification pour vous connecter à ${appName} :

Code : ${code}

Ce code est valable pendant 5 minutes.

Si vous n'avez pas tenté de vous connecter, veuillez ignorer cet email.

Cordialement,
L'équipe ${appName}
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>2FA Code</title>
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .code { font-size: 28px; font-weight: bold; color: #2c7be5; margin: 20px 0; }
  </style>
</head>
<body>
  <h2>Bonjour ${firstName},</h2>
  <p>Voici votre code de vérification pour vous connecter à <strong>${appName}</strong> :</p>
  <div class="code">${code}</div>
  <p>Ce code est valide pendant 5 minutes.</p>
  <p>Si vous n'êtes pas à l'origine de cette tentative, ignorez cet email.</p>
  <p>Merci,<br>L’équipe ${appName}</p>
</body>
</html>
`.trim();

  await this.sendMail(to, subject, text, html);
  this.logger.log(`✅ 2FA code sent to ${to}`);
}


}
