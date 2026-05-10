import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkScheduleEntity } from '../disponibilite/entities/work-schedule.entity/work-schedule.entity';
import { DisponibiliteService } from '../disponibilite/disponibilite.service';

@Injectable()
export class WorkScheduleService {
  private readonly logger = new Logger(WorkScheduleService.name);

  constructor(
    @InjectRepository(WorkScheduleEntity)
    private readonly repository: Repository<WorkScheduleEntity>,
    @Inject(forwardRef(() => DisponibiliteService))
    private readonly dispoService: DisponibiliteService,
  ) {}



  async createOrUpdate(medecinId: number, schedules: Partial<WorkScheduleEntity>[]) {
    await this.repository.delete({ medecinId });
    const entities = schedules.map((s) => this.repository.create({ ...s, medecinId }));
    const saved = await this.repository.save(entities);

    // Generate disponibility slots from today through end of next month
    this.generateSlotsFromToday(medecinId).catch((err) =>
      this.logger.error(`Failed to generate slots after schedule update: ${err.message}`),
    );

    return saved;
  }

  private async generateSlotsFromToday(medecinId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate through end of next month
    const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);

    const currentDate = new Date(today);
    while (currentDate <= endDate) {
      await this.dispoService.syncDailySlotsWithSchedule(medecinId, new Date(currentDate));
      this.logger.log(`Synced slots for ${medecinId} on ${currentDate.toISOString().split('T')[0]}`);
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  async findByMedecinAndDay(medecinId: number, dayOfWeek: number) {
    return this.repository.find({ where: { medecinId, dayOfWeek } });
  }

  async findAllMedecinIds(): Promise<{ medecinId: number }[]> {
  return this.repository
    .createQueryBuilder('ws')
    .select('DISTINCT ws.medecinId', 'medecinId')
    .getRawMany();
}

async deleteByMedecinId(medecinId: number) {
  const result = await this.repository.delete({ medecinId });
  
  // Also wipe available slots for future days since schedule is now empty
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);
  const currentDate = new Date(today);
  
  while (currentDate <= endDate) {
    await this.dispoService.syncDailySlotsWithSchedule(medecinId, new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return result;
}

async getWorkSchedule(medecinId: number) {
  return this.repository.find({ where: { medecinId } });  }
  
}