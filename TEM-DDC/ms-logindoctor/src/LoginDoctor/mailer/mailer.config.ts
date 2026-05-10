// src/mailer/mailer.config.ts
import { ConfigService } from '@nestjs/config';

export const mailerConfig = (config: ConfigService) => ({
  transport: {
    host: config.get<string>('MAIL_HOST'),
    port: config.get<number>('MAIL_PORT'),
    secure: false,
    auth: {
      user: config.get<string>('MAIL_USER'),
      pass: config.get<string>('MAIL_PASS'),
    },
  },
  defaults: {
    from: config.get<string>('MAIL_FROM'),
  },
});
