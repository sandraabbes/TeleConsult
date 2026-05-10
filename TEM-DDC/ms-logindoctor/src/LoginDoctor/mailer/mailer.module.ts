// src/mailer/mailer.module.ts
import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CustomMailerService } from './mailer.service';
import { mailerConfig } from './mailer.config';

@Module({
  imports: [
    ConfigModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: mailerConfig,
    }),
  ],
  providers: [CustomMailerService],
  exports: [CustomMailerService], 
})
export class CustomMailerModule {}
