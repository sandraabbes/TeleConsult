import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { AvailabilityModule } from './availability/availability.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    AvailabilityModule,
  ],
})
export class AppModule {}
