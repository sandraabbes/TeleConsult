import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsultationEntity } from './consultation.entity';
import { ConsultationController } from './consultation.controller';
import { ConsultationService } from './consultation.service';
import { HttpAuthGuard } from '../common/guards/http-auth.guard';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConsultationEntity]),
    HttpModule
  ],
  controllers: [ConsultationController],
  providers: [ConsultationService, HttpAuthGuard],
  exports: [ConsultationService],
})
export class ConsultationModule {}
