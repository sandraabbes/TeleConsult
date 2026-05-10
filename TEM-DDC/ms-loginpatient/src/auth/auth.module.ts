import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './strategies/google.strategy';
import { User } from './user.entity';
import { MailModule } from './mail/mail.module';
import { PasswordResetController } from './reset-password.controller';
import googleOauthConfig from "./config/google-oauth.config";
import facebookOauthConfig from "./config/facebook-oauth.config";
import {FacebookStrategy} from "./strategies/facebook.strategy";
import { LinkedInStrategy } from './strategies/linkedin.strategy';
import linkedinOauthConfig from './config/linkedin-oauth.config';


@Module({
  imports: [
    PassportModule.register({ session: true }),
    ConfigModule, 
    TypeOrmModule.forFeature([User]),
    ConfigModule.forFeature(googleOauthConfig),
    ConfigModule.forFeature(facebookOauthConfig),
    ConfigModule.forFeature(linkedinOauthConfig),
    PassportModule,
    JwtModule.register({
      secret: 'supersecretkey',
      signOptions: { expiresIn: '7d' },
    }),
    MailModule,
  ],
  providers: [AuthService, GoogleStrategy, FacebookStrategy, LinkedInStrategy],
  controllers: [AuthController, PasswordResetController],
})
export class AuthModule {}
