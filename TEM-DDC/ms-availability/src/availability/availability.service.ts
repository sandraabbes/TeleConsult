import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Availability } from 'src/availability/entities/availability.entity'; 
import { CreateAvailabilityDto } from 'src/availability/dto/create-availability.dto'; 
import { addMinutes, startOfDay, endOfDay, parseISO, isValid } from 'date-fns';
import axios from 'axios';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(Availability)
    private readonly repo: Repository<Availability>,
  ) {}

  // ✅ Vérifie si le doctor existe dans ms-doctor
 private async validateDoctor(doctorId: number) {
  try {
    const doctorServiceUrl = process.env.DOCTOR_SERVICE_URL || 'http://localhost:3032';
    const response = await axios.get(`${doctorServiceUrl}/doctors/${doctorId}`);
    return response.data;
  } catch (error) {
    throw new HttpException(
      `Doctor not found in ms-doctor (id=${doctorId})`,
      HttpStatus.BAD_REQUEST,
    );
  }
}


  async create(dto: CreateAvailabilityDto) {
    await this.validateDoctor(dto.doctorId); // 🔹 validation avant création
    const slot = this.repo.create(dto);
    return this.repo.save(slot);
  }

  async initializeSlotsWithBlocks(
    doctorId: number,
    dateInput: Date | string,
    timeBlocks: { start: string; end: string; duration?: number }[],
  ) {
    await this.validateDoctor(doctorId); // 🔹 validation doctor

    const date = this.parseDate(dateInput);

    await this.repo.delete({
      doctorId,
      startTime: Between(startOfDay(date), endOfDay(date)),
    });

    const allSlots: Availability[] = [];

    for (const block of timeBlocks) {
      const duration = block.duration || 30;
      const [startH, startM] = block.start.split(':').map(Number);
      const [endH, endM] = block.end.split(':').map(Number);

      const blockStart = new Date(date);
      blockStart.setHours(startH, startM, 0, 0);

      const blockEnd = new Date(date);
      blockEnd.setHours(endH, endM, 0, 0);

      let currentStart = new Date(blockStart);
      while (currentStart < blockEnd) {
        const currentEnd = addMinutes(currentStart, duration);
        if (currentEnd > blockEnd) break;

        allSlots.push({
          id: 0,
          doctorId,
          startTime: new Date(currentStart),
          endTime: new Date(currentEnd),
          isAvailable: true,
        });

        currentStart = currentEnd;
      }
    }

    return this.repo.save(allSlots);
  }

  async findAvailableSlots(doctorId: number, dateInput: Date | string) {
    await this.validateDoctor(doctorId); // 🔹 validation doctor
    const date = this.parseDate(dateInput);
    return this.repo.find({
      where: {
        doctorId,
        isAvailable: true,
        startTime: MoreThanOrEqual(startOfDay(date)),
        endTime: LessThanOrEqual(endOfDay(date)),
      },
      order: { startTime: 'ASC' },
    });
  }

  async markTimeRangeUnavailable(doctorId: number, start: Date, end: Date) {
    await this.validateDoctor(doctorId); // 🔹 validation doctor

    const overlapping = await this.repo.find({
      where: {
        doctorId,
        startTime: LessThanOrEqual(end),
        endTime: MoreThanOrEqual(start),
        isAvailable: true,
      },
    });

    const ids = overlapping.map((s) => s.id);
    if (ids.length > 0) await this.repo.update({ id: In(ids) }, { isAvailable: false });

    return { affectedSlots: ids.length };
  }

  async markTimeRangeAvailable(doctorId: number, start: Date, end: Date) {
    await this.validateDoctor(doctorId); // 🔹 validation doctor

    const overlapping = await this.repo.find({
      where: {
        doctorId,
        startTime: LessThanOrEqual(end),
        endTime: MoreThanOrEqual(start),
        isAvailable: false,
      },
    });

    const ids = overlapping.map((s) => s.id);
    if (ids.length > 0) await this.repo.update({ id: In(ids) }, { isAvailable: true });

    return { affectedSlots: ids.length };
  }

  async markDayUnavailable(doctorId: number, dateInput: Date | string) {
    await this.validateDoctor(doctorId); // 🔹 validation doctor

    const date = this.parseDate(dateInput);
    const slots = await this.repo.find({
      where: { doctorId, startTime: Between(startOfDay(date), endOfDay(date)), isAvailable: true },
    });

    const ids = slots.map((s) => s.id);
    if (ids.length > 0) await this.repo.update({ id: In(ids) }, { isAvailable: false });

    return { affectedSlots: ids.length, message: `All slots for ${dateInput} marked as unavailable` };
  }

  async markDayAvailable(doctorId: number, dateInput: Date | string) {
    await this.validateDoctor(doctorId); // 🔹 validation doctor

    const date = this.parseDate(dateInput);
    const slots = await this.repo.find({
      where: { doctorId, startTime: Between(startOfDay(date), endOfDay(date)), isAvailable: false },
    });

    const ids = slots.map((s) => s.id);
    if (ids.length > 0) await this.repo.update({ id: In(ids) }, { isAvailable: true });

    return { affectedSlots: ids.length, message: `All slots for ${dateInput} marked as available` };
  }

  private parseDate(dateInput: Date | string): Date {
    let date: Date;
    if (typeof dateInput === 'string') {
      date = dateInput.includes('T') ? parseISO(dateInput) : new Date(dateInput + 'T00:00:00.000Z');
    } else {
      date = dateInput;
    }
    if (!isValid(date)) throw new HttpException('Invalid date format', HttpStatus.BAD_REQUEST);
    return date;
  }
}
