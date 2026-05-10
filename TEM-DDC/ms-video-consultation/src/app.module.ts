import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { NotificationsClientModule } from './notifications-client/notifications-client.module';
import { MedicalRecordsClientModule } from './medical-records-client/medical-records-client.module';
import { ConsultationModule } from './consultation/consultation.module';
import { SignalingModule } from './signaling/signaling.module';
import { WaitingRoomModule } from './waiting-room/waiting-room.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: databaseConfig,
      inject: [ConfigService],
      imports: [ConfigModule],
    }),
    NotificationsClientModule,
    MedicalRecordsClientModule,
    ConsultationModule,
    SignalingModule,
    WaitingRoomModule,
  ],
})
export class AppModule {}
