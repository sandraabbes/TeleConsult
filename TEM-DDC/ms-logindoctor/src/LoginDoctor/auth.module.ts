import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Doctor } from './entities/doctor.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CustomMailerModule } from './mailer/mailer.module';
import * as fs from 'fs';
import { JwksController } from './jwks.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forFeature([Doctor]),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const privateKey = fs.readFileSync('keys/private.pem', 'utf8');
        const publicKey = fs.readFileSync('keys/public.pem', 'utf8');

        return {
          privateKey,
          publicKey,
          signOptions: {
            algorithm: 'RS256',
            expiresIn: '2h',
          },
        };
      },
    }),

    CustomMailerModule,
  ],
  controllers: [AuthController, JwksController],
  providers: [AuthService],
})
export class AuthModule {}
