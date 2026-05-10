// src/rendezvous/rendezvous.module.ts
import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';

import { RendezvousService } from './rendezvous.service';
import { RendezvousController } from './rendezvous.controller';
import { Rendezvous } from './entities/rendezvous.entity/rendezvous.entity';

import { databaseConfig } from '../config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: databaseConfig,
    }),
    TypeOrmModule.forFeature([Rendezvous]),
    HttpModule,
  ],
  controllers: [RendezvousController],
  providers: [
    RendezvousService,
    {
      provide: 'NOTIFICATIONS_SERVICE',
      useFactory: () => {
        return ClientProxyFactory.create({
          transport: Transport.TCP,
          options: {
            host: process.env.NOTIFICATIONS_SERVICE_HOST || 'localhost',
            port: parseInt(process.env.NOTIFICATIONS_SERVICE_PORT || '4005', 10),
          },
        });
      },
    },
    {
      provide: 'PAYMENTS_SERVICE',
      useFactory: () => {
        return ClientProxyFactory.create({
          transport: Transport.TCP,
          options: {
            host: process.env.PAYMENTS_SERVICE_HOST || 'localhost',
            port: parseInt(process.env.PAYMENTS_SERVICE_PORT || '4007', 10),
          },
        });
      },
    },
  ],
})
export class RendezvousModule {
  constructor(private readonly config: ConfigService) {
    new Logger(RendezvousModule.name).log(
      `DB connected: ${this.config.get('DB_HOST')}/${this.config.get('DB_NAME')}`,
    );
  }
}
