import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AiController } from './ai.controller';
import { JwtPatientGuard } from '../common/guards/jwt-patient.guard';
import { JwtDoctorGuard } from '../common/guards/jwt-doctor.guard';
import { JwtPatientOrDoctorGuard } from '../common/guards/jwt-patient-or-doctor.guard';
import { JwtStrategy } from '../common/strategies/jwt.strategy';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default_secret',
      }),
      inject: [ConfigService],
    }),
    ClientsModule.registerAsync([
      {
        name: 'AI_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('AI_SERVICE_HOST') || 'localhost',
            port: configService.get('AI_SERVICE_PORT') || 4010,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'MEDICAL_RECORDS_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('MEDICAL_RECORDS_SERVICE_HOST') || 'localhost',
            port: configService.get('MEDICAL_RECORDS_SERVICE_PORT') || 4006,
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [AiController],
  providers: [
    JwtPatientGuard,
    JwtDoctorGuard,
    JwtPatientOrDoctorGuard,
    JwtStrategy,
  ],
})
export class AiModule {}