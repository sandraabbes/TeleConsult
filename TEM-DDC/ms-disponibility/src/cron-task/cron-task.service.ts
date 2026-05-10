/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DisponibiliteService } from '../disponibilite/disponibilite.service';
import { WorkScheduleService } from '../work-schedule/work-schedule.service';

@Injectable()
export class CronTaskService {
  private readonly logger = new Logger(CronTaskService.name);
  private readonly QUARTERLY_MONTHS = [0, 3, 6, 9]; // Jan, Apr, Jul, Oct

  constructor(
    private readonly dispoService: DisponibiliteService,
    private readonly workScheduleService: WorkScheduleService,
  ) {}

  // 🔄 Single cron to handle all generations
  @Cron('0 0 1 * *') // Runs monthly on 1st at midnight
  async handleSlotGeneration() {
    try {
      const now = new Date();
      const isQuarterStart = this.QUARTERLY_MONTHS.includes(now.getMonth());
      
      if (isQuarterStart) {
        await this.generateSlotsForPeriod(now, 3); // 3 months ahead
      } else {
        await this.generateSlotsForPeriod(now, 1); // Just next month
      }
    } catch (error) {
      this.logger.error(`Slot generation failed: ${error.message}`, error.stack);
    }
  }

  private async generateSlotsForPeriod(startDate: Date, monthsCount: number) {
    const medecins = await this.workScheduleService.findAllMedecinIds();
          const generationPromises: Promise<void>[] = [];
    for (let monthOffset = 0; monthOffset < monthsCount; monthOffset++) {
      const targetDate = new Date(startDate);
      targetDate.setMonth(startDate.getMonth() + monthOffset + 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (const medecin of medecins) {
        for (let day = 1; day <= daysInMonth; day++) {
          generationPromises.push(
            this.processDay(medecin.medecinId, new Date(year, month, day))
          );
        }
      }
    }

    await Promise.all(generationPromises);
  }

  private async processDay(medecinId: number, date: Date) {
    try {
      const exists = await this.dispoService.hasSlotsForDay(medecinId, date);
      if (!exists) {
        await this.dispoService.generateDailySlotsFromSchedule(medecinId, date);
        this.logger.log(`Generated slots for ${medecinId} on ${date.toISOString()}`);
      }
    } catch (error) {
      this.logger.warn(
        `Failed processing ${medecinId} for ${date.toISOString()}: ${error.message}`
      );
    }
  }
}