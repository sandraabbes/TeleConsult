import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkScheduleEntity } from '../disponibilite/entities/work-schedule.entity/work-schedule.entity';
import { WorkScheduleService } from './work-schedule.service';
import { DisponibiliteModule } from '../disponibilite/disponibilite.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkScheduleEntity]),
    forwardRef(() => DisponibiliteModule),
  ],
  providers: [WorkScheduleService],
  exports: [WorkScheduleService],
})
export class WorkScheduleModule {}
