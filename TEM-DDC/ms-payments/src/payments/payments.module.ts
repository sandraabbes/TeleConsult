import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { HttpModule } from '@nestjs/axios';

import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Payment } from '../entities/payment.entity';
import { databaseConfig } from '../config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: databaseConfig,
    }),
    TypeOrmModule.forFeature([Payment]),
    HttpModule,
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
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
    {
      provide: 'RENDEZVOUS_SERVICE',
      useFactory: () =>
        ClientProxyFactory.create({
          transport: Transport.TCP,
          options: {
            host: process.env.RENDEZVOUS_SERVICE_HOST || 'localhost',
            port: parseInt(
              process.env.RENDEZVOUS_SERVICE_PORT || '3005',
              10,
            ),
          },
        }),
    },
  ],
})
export class PaymentsModule {}

