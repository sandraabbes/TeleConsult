/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DisponibiliteModule } from './disponibilite/disponibilite.module';
import { WorkScheduleService } from './work-schedule/work-schedule.service';
import { WorkScheduleController } from './work-schedule/work-schedule.controller';
import { WorkScheduleEntity } from './disponibilite/entities/work-schedule.entity/work-schedule.entity';
import { CronTaskService } from './cron-task/cron-task.service';
import { WorkScheduleModule } from './work-schedule/work-schedule.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'postgres',
      database: process.env.DB_NAME || 'disponibilityDb',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // WARNING: disable in production
    }),

    TypeOrmModule.forFeature([WorkScheduleEntity]),
    DisponibiliteModule,
    WorkScheduleModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController, WorkScheduleController],
  providers: [AppService, WorkScheduleService, CronTaskService],
})
export class AppModule {}
