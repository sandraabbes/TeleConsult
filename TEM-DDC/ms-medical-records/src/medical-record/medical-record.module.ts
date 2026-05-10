import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { MedicalRecordController } from './medical-record.controller';
import { MedicalRecordService } from './medical-record.service';
import { MedicalRecordEntity } from './entities/medical-record.entity';
import { PrescriptionEntity } from '../prescription/entities/prescription.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MedicalRecordEntity, PrescriptionEntity]),
  ],
  controllers: [MedicalRecordController],
  providers: [
    MedicalRecordService,
    {
      provide: 'NOTIFICATIONS_SERVICE',
      useFactory: () =>
        ClientProxyFactory.create({
          transport: Transport.TCP,
          options: {
            host: process.env.NOTIFICATIONS_SERVICE_HOST || 'localhost',
            port: parseInt(
              process.env.NOTIFICATIONS_SERVICE_PORT || '4005',
              10,
            ),
          },
        }),
    },
  ],
})
export class MedicalRecordModule {}
