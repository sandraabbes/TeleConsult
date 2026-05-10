import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  LessThanOrEqual,
  LessThan,
  Repository,
  Between,
  Equal,
  MoreThan, 
} from 'typeorm';
import { Disponibilite } from '../disponibilite/entities/disponibilite.entity/disponibilite.entity';
import { CreateDisponibiliteDto } from '../disponibilite/dto/create-disponibilite.dto/create-disponibilite.dto';
import { addMinutes, startOfDay, endOfDay } from 'date-fns';
import { WorkScheduleService } from 'src/work-schedule/work-schedule.service';
import { In } from 'typeorm';

@Injectable()
export class DisponibiliteService {
  private readonly logger = new Logger(DisponibiliteService.name);
  constructor(
    @InjectRepository(Disponibilite)
    private readonly disponibiliteRepository: Repository<Disponibilite>,
    @Inject(forwardRef(() => WorkScheduleService))
    private readonly workScheduleService: WorkScheduleService,
  ) {}

  async create(createDisponibiliteDto: CreateDisponibiliteDto) {
    // Convert string dates to Date objects for the database
    const disponibilite = this.disponibiliteRepository.create({
      ...createDisponibiliteDto,
      startTime: new Date(createDisponibiliteDto.startTime),
      endTime: new Date(createDisponibiliteDto.endTime),
    });
    return this.disponibiliteRepository.save(disponibilite);
  }

  async initializeSlots(medecinId: number, date: Date, duration: number = 30) {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

    // 🔍 Get work schedules (array)
    const workSchedules = await this.workScheduleService.findByMedecinAndDay(
      medecinId,
      dayOfWeek,
    );

    const schedule = workSchedules[0]; // ✅ Take the first schedule

    if (!schedule) {
      throw new Error(
        `No work schedule found for medecin ${medecinId} on day ${dayOfWeek}`,
      );
    }

    const [startHours, startMinutes] = schedule.startTime
      .split(':')
      .map(Number);
    const [endHours, endMinutes] = schedule.endTime.split(':').map(Number);

    const startDateTime = new Date(date);
    startDateTime.setHours(startHours, startMinutes, 0, 0);

    const endDateTime = new Date(date);
    endDateTime.setHours(endHours, endMinutes, 0, 0);

    // 🧹 Delete old slots
    await this.disponibiliteRepository.delete({
      medecinId,
      startTime: Between(startOfDay(date), endOfDay(date)),
    });

    const slots: Disponibilite[] = [];
    let currentStart = new Date(startDateTime);

    while (currentStart < endDateTime) {
      const currentEnd = addMinutes(currentStart, duration);
      if (currentEnd > endDateTime) break;

      slots.push({
        medecinId,
        startTime: new Date(currentStart),
        endTime: new Date(currentEnd),
        isAvailable: true,
        id: 0,
      });

      currentStart = currentEnd;
    }

    return this.disponibiliteRepository.save(slots);
  }

  async hasSlotsForDay(medecinId: number, date: Date): Promise<boolean> {
    // 1. Vérification rapide via un count plutôt qu'un find
    const count = await this.disponibiliteRepository.count({
      where: {
        medecinId,
        isAvailable: true,
        startTime: Between(startOfDay(date), endOfDay(date)),
      },
    });

    return count > 0;
  }

  async generateDailySlotsFromSchedule(medecinId: number, date: Date) {
    const dayOfWeek = date.getDay();
    const schedules = await this.workScheduleService.findByMedecinAndDay(
      medecinId,
      dayOfWeek,
    );
    const slots: Disponibilite[] = [];

    const startOfDayLocal = startOfDay(date);
    const endOfDayLocal = endOfDay(date);
    
    // Fetch existing unavailable (booked) slots to prevent overlaps
    const existingUnavailable = await this.disponibiliteRepository.find({
      where: {
        medecinId,
        isAvailable: false,
        startTime: Between(startOfDayLocal, endOfDayLocal),
      },
    });

    for (const sched of schedules) {
      const [startH, startM] = sched.startTime.split(':').map(Number);
      const [endH, endM] = sched.endTime.split(':').map(Number);

      const start = new Date(date);
      start.setHours(startH, startM, 0, 0);
      const end = new Date(date);
      end.setHours(endH, endM, 0, 0);

      let current = new Date(start);
      while (current < end) {
        const slotEnd = addMinutes(current, sched.slotDuration);
        if (slotEnd > end) break;

        // Ensure new available slot doesn't overlap with a booked appointment
        const isOverlapping = existingUnavailable.some((uSlot) => {
          return current < new Date(uSlot.endTime) && slotEnd > new Date(uSlot.startTime);
        });

        if (!isOverlapping) {
          slots.push({
            medecinId,
            startTime: new Date(current),
            endTime: new Date(slotEnd),
            isAvailable: true,
            id: 0,
          });
        }

        current = slotEnd;
      }
    }

    if (slots.length > 0) {
      return this.disponibiliteRepository.save(slots);
    }
    return [];
  }

  async syncDailySlotsWithSchedule(medecinId: number, date: Date) {
    const startOfDayLocal = startOfDay(date);
    const endOfDayLocal = endOfDay(date);

    // 1. Delete all existing AVAILABLE slots for this day
    await this.disponibiliteRepository.delete({
      medecinId,
      isAvailable: true,
      startTime: Between(startOfDayLocal, endOfDayLocal),
    });

    // 2. Generate new available slots from the updated schedule
    await this.generateDailySlotsFromSchedule(medecinId, date);
  }



 // Dans disponibilite.service.ts
// Remplacez la méthode findAvailableSlots par celle-ci :

async findAvailableSlots(medecinId: number, date: Date) {
  // ✅ CORRECTION : Utiliser des dates UTC sans conversion timezone
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  
  // Créer les timestamps pour le début et la fin du jour EN UTC
  const startOfDayUTC = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  const endOfDayUTC = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
  
  // 🧪 Logs de debug
  this.logger.log('='.repeat(60));
  this.logger.log('[findAvailableSlots] Called with:');
  this.logger.log(`  medecinId: ${medecinId} (${typeof medecinId})`);
  this.logger.log(`  date (input): ${date.toISOString()}`);
  this.logger.log(`  startOfDayUTC: ${startOfDayUTC.toISOString()}`);
  this.logger.log(`  endOfDayUTC: ${endOfDayUTC.toISOString()}`);

  // ✅ Requête avec Between sur startTime
  const slots = await this.disponibiliteRepository.find({
    where: {
      medecinId,
      isAvailable: true,
      startTime: Between(startOfDayUTC, endOfDayUTC),
    },
    order: { startTime: 'ASC' },
  });

  // 🧪 Logs du résultat
  this.logger.log(`[findAvailableSlots] Found ${slots.length} slots`);
  if (slots.length > 0) {
    this.logger.log(`[findAvailableSlots] First slot:`, {
      id: slots[0].id,
      startTime: slots[0].startTime,
      endTime: slots[0].endTime,
    });
    this.logger.log(`[findAvailableSlots] Last slot:`, {
      id: slots[slots.length - 1].id,
      startTime: slots[slots.length - 1].startTime,
      endTime: slots[slots.length - 1].endTime,
    });
  } else {
    this.logger.warn('[findAvailableSlots] ⚠️ No slots found!');
    
    // Debug : compter tous les slots
    const totalSlots = await this.disponibiliteRepository.count({
      where: { medecinId }
    });
    this.logger.warn(`[findAvailableSlots] Total slots for medecinId ${medecinId}: ${totalSlots}`);
    
    const availableSlots = await this.disponibiliteRepository.count({
      where: { medecinId, isAvailable: true }
    });
    this.logger.warn(`[findAvailableSlots] Available slots (any date): ${availableSlots}`);
  }
  this.logger.log('='.repeat(60));

  return slots;
}


  async markTimeRangeUnavailable(medecinId: number, start: Date, end: Date) {
    const startDate = new Date(start);
    const endDate = new Date(end);

    const overlappingSlots = await this.disponibiliteRepository.find({
      where: {
        medecinId,
        startTime: LessThan(endDate),
        endTime: MoreThan(startDate),
        isAvailable: true,
      },
    });

    const slotIds = overlappingSlots.map((slot) => slot.id);
    if (slotIds.length > 0) {
      await this.disponibiliteRepository.update(
        { id: In(slotIds) },
        { isAvailable: false },
      );
    }

    return { affectedSlots: slotIds.length };
  }

  async markTimeRangeAvailable(medecinId: number, start: Date, end: Date) {
    const startDate = new Date(start);
    const endDate = new Date(end);

    const overlappingSlots = await this.disponibiliteRepository.find({
      where: {
        medecinId,
        startTime: LessThan(endDate),
        endTime: MoreThan(startDate),
        isAvailable: false,
      },
    });

    const slotIds = overlappingSlots.map((slot) => slot.id);
    if (slotIds.length > 0) {
      await this.disponibiliteRepository.update(
        { id: In(slotIds) },
        { isAvailable: true },
      );
    }

    return { affectedSlots: slotIds.length };
  }

  async markSlotAsUnavailable(medecinId: number, start: Date, end: Date) {
    const matchingSlots = await this.disponibiliteRepository.find({
      where: {
        medecinId,
        startTime: Equal(start),
        endTime: Equal(end),
        isAvailable: true,
      },
    });

    const slotIds = matchingSlots.map((slot) => slot.id);
    if (slotIds.length > 0) {
      await this.disponibiliteRepository.update(
        { id: In(slotIds) },
        { isAvailable: false },
      );
    }

    return { affectedSlots: slotIds.length };
  }

  async markSlotAsAvailable(medecinId: number, start: Date, end: Date) {
    const matchingSlots = await this.disponibiliteRepository.find({
      where: {
        medecinId,
        startTime: Equal(start),
        endTime: Equal(end),
        isAvailable: false,
      },
    });

    const slotIds = matchingSlots.map((slot) => slot.id);
    if (slotIds.length > 0) {
      await this.disponibiliteRepository.update(
        { id: In(slotIds) },
        { isAvailable: true },
      );
    }

    return { affectedSlots: slotIds.length };
  }


async checkAvailability(medecinId: number, dateStr: string, timeStr: string) {
  // 1) Construire la Date à partir de (date, time)
  const [hh, mm] = (timeStr || '00:00').split(':').map(Number);
  const d = new Date(`${dateStr}T00:00:00`);
  d.setHours(hh || 0, mm || 0, 0, 0);

  // 2) Y a-t-il déjà un slot ouvert qui couvre ce point ?
  const hasOpenSlot = await this.disponibiliteRepository.findOne({
    where: {
      medecinId,
      isAvailable: true,
      startTime: LessThanOrEqual(d),
      endTime: MoreThan(d),
    },
  });
  if (hasOpenSlot) {
    return { available: true, source: 'slot' };
  }

  // 3) Y a-t-il un blocage explicite à cet instant ?
  const isBlocked = await this.disponibiliteRepository.findOne({
    where: {
      medecinId,
      isAvailable: false,
      startTime: LessThanOrEqual(d),
      endTime: MoreThan(d),
    },
  });
  if (isBlocked) {
    return { available: false, source: 'blocked' };
  }

  // 4) Sinon, regarde le work-schedule
  const day = d.getDay();
  const schedules = await this.workScheduleService.findByMedecinAndDay(medecinId, day);
  const inside = schedules.find(s => {
    const [sh, sm] = s.startTime.split(':').map(Number);
    const [eh, em] = s.endTime.split(':').map(Number);
    const start = new Date(d); start.setHours(sh||0, sm||0, 0, 0);
    const end   = new Date(d); end.setHours(eh||0, em||0, 0, 0);
    return d >= start && d < end;
  });

  if (!inside) {
    return { available: false, source: 'outside_schedule' };
  }

  // 5) (Optionnel mais super pratique) — créer le slot automatiquement
  const slotDuration = inside.slotDuration ?? 30;
  const slot = this.disponibiliteRepository.create({
    medecinId,
    startTime: d,
    endTime: addMinutes(d, slotDuration),
    isAvailable: true,
  });
  await this.disponibiliteRepository.save(slot);

  return { available: true, source: 'auto_from_schedule' };
}
}
