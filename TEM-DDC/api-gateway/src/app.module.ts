import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { JwtPatientGuard } from './common/guards/jwt-patient.guard';
import { JwtDoctorGuard } from './common/guards/jwt-doctor.guard';
import { WsJwtGuard } from './common/guards/ws-jwt.guard';
import { AdminGuard } from './common/guards/admin.guard';
import { JwtStrategy } from './common/strategies/jwt.strategy';
import { UsersGatewayController } from './gateway/gateway.register.controller';
import { AuthGatewayController } from './gateway/gateway.login.controller';
import { DisponibiliteGatewayController } from './gateway/disponibilite.gateway.controller';
import { GatewayRegisterDoctorController } from './gateway/gateway.registerDoctor.controller';
import { GatewayLoginDoctorController } from './gateway/gateway.loginDoctor.controller';
import { RendezvousGwController } from './gateway/rendezvous.gateway.controller';
import { VideoConsultationGatewayController } from './gateway/video-consultation.gateway.controller';
import { NotificationsGatewayController } from './gateway/notifications.gateway.controller';
import { MedicalRecordsGatewayController } from './gateway/medical-records.gateway.controller';
import { GatewayDoctorProfileController } from './gateway/gateway-doctor-profile.controller';
import { PaymentsGatewayController } from './gateway/payments.gateway.controller';
import { AvailabilityGatewayController } from './gateway/availability.gateway.controller';
import { MessagesGatewayController } from './gateway/messages.gateway.controller';
import { AdminGatewayController } from './gateway/admin.gateway.controller';
import { AuthModule } from './auth/auth.module';
import { AiModule } from './ai/ai.module';
import { AdminModule } from './admin/admin.module';
import { JwtPatientOrDoctorGuard } from './common/guards/jwt-patient-or-doctor.guard';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    HttpModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const jwtSecret = configService.get<string>('JWT_SECRET') || 'default_secret';
        console.log('[JWT Config] JWT Secret:', jwtSecret ? '***' : 'NOT SET');
        console.log('[JWT Config] Doctor JWKS URI:', configService.get('DOCTOR_JWKS_URI'));
        console.log('[JWT Config] Doctor ISS:', configService.get('DOCTOR_ISS'));
        return {
          secret: jwtSecret,
          signOptions: { expiresIn: '2h' },
        };
      },
    }),
    AuthModule,
    AiModule,
    AdminModule,
  ],
  controllers: [
    UsersGatewayController,
    AuthGatewayController,
    DisponibiliteGatewayController,
    RendezvousGwController,
    VideoConsultationGatewayController,
    NotificationsGatewayController,
    MedicalRecordsGatewayController,
    GatewayRegisterDoctorController,
    GatewayLoginDoctorController,
    GatewayDoctorProfileController,
    PaymentsGatewayController,
    AvailabilityGatewayController,
    MessagesGatewayController,
    AdminGatewayController,
  ],

  providers: [
    JwtAuthGuard,
    JwtPatientGuard,
    JwtDoctorGuard,
    JwtPatientOrDoctorGuard,
    WsJwtGuard,
    AdminGuard,
    JwtStrategy,
  ],
  exports: [JwtModule, JwtDoctorGuard, JwtPatientGuard],
})
export class AppModule {}