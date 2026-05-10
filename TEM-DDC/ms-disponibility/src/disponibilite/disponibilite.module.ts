import { Module, forwardRef } from '@nestjs/common';
import { DisponibiliteController } from './disponibilite.controller';
import { DisponibiliteService } from './disponibilite.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Disponibilite } from './entities/disponibilite.entity/disponibilite.entity';
import { WorkScheduleModule } from 'src/work-schedule/work-schedule.module';

@Module({
  controllers: [DisponibiliteController],
  providers: [DisponibiliteService],
  imports: [
    TypeOrmModule.forFeature([Disponibilite]),
    forwardRef(() => WorkScheduleModule),
  ],
  exports: [DisponibiliteService],
})
export class DisponibiliteModule {}
