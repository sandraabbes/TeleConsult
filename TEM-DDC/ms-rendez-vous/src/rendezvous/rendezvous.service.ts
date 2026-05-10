import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

import { Rendezvous } from './entities/rendezvous.entity/rendezvous.entity';
import { RendezvousStatus } from './entities/rendezvous-status.enum';
import { RendezvousType } from './entities/rendezvous-type.enum';

import { CreateRendezvousDto } from './dto/create-rendezvous.dto/create-rendezvous.dto';
import { UpdateRendezvousDto } from './dto/update-rendezvous.dto/update-rendezvous.dto';
import * as dayjs from 'dayjs';

const trim = (s?: string) => (s ? String(s).replace(/\/+$/, '') : '');

@Injectable()
export class RendezvousService {
  private readonly log = new Logger(RendezvousService.name);
  private readonly gwBase: string;

  constructor(
    @InjectRepository(Rendezvous)
    private readonly repo: Repository<Rendezvous>,
    private readonly http: HttpService,
    @Inject('NOTIFICATIONS_SERVICE') private readonly notificationsClient: ClientProxy,
    @Inject('PAYMENTS_SERVICE') private readonly paymentsClient: ClientProxy,
  ) {
    const gw = trim(process.env.GATEWAY_URL || 'http://localhost:3045/api');
    this.gwBase = gw;
  }

  /* ------------------- Helpers Dispos (best-effort) ------------------- */

  private async markSlotUnavailableSafe(
    medecinId: number,
    startTime: Date,
    endTime: Date,
  ) {
    try {
      const url = `${this.gwBase}/disponibilites/mark-unavailable`;
      await firstValueFrom(
        this.http.post(
          url,
          {
            medecinId,
            start: startTime.toISOString(),  // ✅ Fixed: was 'startTime', endpoint expects 'start'
            end: endTime.toISOString(),        // ✅ Fixed: was 'endTime', endpoint expects 'end'
          },
          { timeout: 7000 },
        ),
      );
      this.log.debug(`[RDV] slot UNAVAILABLE via GW: ${medecinId} ${startTime.toISOString()}`);
    } catch (e: any) {
      this.log.warn(`[RDV] mark-unavailable failed (non-blocking): ${e?.message || e}`);
    }
  }

  private async markAvailable(medecinId: number, startISO: string, endISO: string) {
    try {
      const url = `${this.gwBase}/disponibilites/mark-available`;
      await firstValueFrom(
        this.http.post(url, { medecinId, start: startISO, end: endISO }, { timeout: 7000 }),  // ✅ Fixed: was 'startTime'/'endTime'
      );
      this.log.debug(`[RDV] slot AVAILABLE via GW: ${medecinId} ${startISO} -> ${endISO}`);
    } catch (e: any) {
      this.log.warn(`[RDV] mark-available failed (non-blocking): ${e?.message || e}`);
    }
  }

  private isBlockingStatus(s: RendezvousStatus) {
    return s === RendezvousStatus.SCHEDULED || s === RendezvousStatus.CONFIRMED || s === RendezvousStatus.PENDING;
  }

  private async notifyCreate(rdv: Rendezvous, patientName?: string) {
    try {
      const name = patientName?.trim() || 'a patient';
      const time = dayjs(rdv.startTime).format('MMM D, hh:mm A');
      await firstValueFrom(
        this.notificationsClient.send('create_notification', {
          userId: String(rdv.medecinId),
          userType: 'DOCTOR',
          type: 'APPOINTMENT_REQUESTED',
          message: `You have a new consultation request from ${name} at ${time}`,
        }),
      );
    } catch (e: any) {
      this.log.warn(`[RDV] create_notification failed (non-blocking): ${e?.message || e}`);
    }
  }

  private async notifyConfirm(rdv: Rendezvous, doctorName?: string) {
    try {
      const name = doctorName?.trim() ? `Dr. ${doctorName.trim()}` : 'the doctor';
      await firstValueFrom(
        this.notificationsClient.send('create_notification', {
          userId: rdv.patientId,
          userType: 'PATIENT',
          type: 'APPOINTMENT_CONFIRMED',
          message: `Your appointment has been confirmed by ${name}`,
        }),
      );
    } catch (e: any) {
      this.log.warn(`[RDV] create_notification failed (non-blocking): ${e?.message || e}`);
    }
  }

  private async notifyCancel(rdv: Rendezvous, doctorName?: string) {
    try {
      const name = doctorName?.trim() ? `Dr. ${doctorName.trim()}` : 'the doctor';
      await firstValueFrom(
        this.notificationsClient.send('create_notification', {
          userId: rdv.patientId,
          userType: 'PATIENT',
          type: 'APPOINTMENT_CANCELLED',
          message: `Your appointment has been declined by ${name}`,
        }),
      );
    } catch (e: any) {
      this.log.warn(`[RDV] create_notification failed (non-blocking): ${e?.message || e}`);
    }
  }

  private async notifyReschedule(rdv: Rendezvous, patientName?: string) {
    try {
      const name = patientName?.trim() || 'The patient';
      const time = dayjs(rdv.startTime).format('MMM D, hh:mm A');
      await firstValueFrom(
        this.notificationsClient.send('create_notification', {
          userId: String(rdv.medecinId),
          userType: 'DOCTOR',
          type: 'APPOINTMENT_RESCHEDULED',
          message: `${name} has rescheduled their appointment to ${time}`,
        }),
      );
    } catch (e: any) {
      this.log.warn(`[RDV] notifyReschedule failed (non-blocking): ${e?.message || e}`);
    }
  }

  /* --------------------------- MUTATIONS --------------------------- */

  async create(dto: CreateRendezvousDto) {
    // ✅ Validation et conversion des dates
    const start = new Date(dto.startTime as unknown as string);
    const end = new Date(dto.endTime as unknown as string);
    if (isNaN(start.getTime())) throw new BadRequestException('Invalid startTime');
    if (isNaN(end.getTime())) throw new BadRequestException('Invalid endTime');

    // ✅ Conversion stricte: medecinId DOIT être un number
    const medecinId = Number(dto.medecinId);
    if (!Number.isFinite(medecinId) || medecinId <= 0) {
      throw new BadRequestException('Invalid medecinId: must be a positive number');
    }

    // ✅ Conversion stricte: patientId DOIT être une string non vide
    const patientId = String(dto.patientId || '').trim();
    if (!patientId) {
      throw new BadRequestException('patientId is required');
    }

    // Anti-doublon manuel (en plus de l'index unique medecinId+startTime)
    const existing = await this.repo.findOne({
      where: { medecinId, startTime: start },
    });

    if (existing && this.isBlockingStatus(existing.status)) {
      if (existing.patientId === patientId) {
        throw new ConflictException('You already booked an appointment in this slot/time.');
      }
      throw new ConflictException('This slot has already been booked by another patient.');
    }

    const entity = this.repo.create({
      medecinId,
      patientId,
      startTime: start,
      endTime: end,
      status: RendezvousStatus.PENDING,
      type: dto.type ?? RendezvousType.STANDARD,
    });

    try {
      const saved = await this.repo.save(entity);
      await this.markSlotUnavailableSafe(saved.medecinId, saved.startTime, saved.endTime);
      await this.notifyCreate(saved, dto.patientName);

      // ✅ Fixed: using send instead of emit so ms-payments actually receives and processes it
      await firstValueFrom(
        this.paymentsClient.send('create_payment', {
          rendezvousId: saved.id,
          patientId: saved.patientId,
          amount: 50.0,
        }),
      ).catch((err) =>
        this.log.warn(`[RDV] create_payment failed (non-blocking): ${err?.message || err}`),
      );

      return saved;
    } catch (e: any) {
      const code = e?.driverError?.code || e?.code;
      if (code === '23505') {
        throw new ConflictException(
          'This slot was just booked by someone else. Please pick another time.',
        );
      }
      throw e;
    }
  }

  async update(id: number, dto: UpdateRendezvousDto) {
    const rdv = await this.repo.findOne({ where: { id } });
    if (!rdv) throw new NotFoundException('Rendezvous not found');

    const partial: Partial<Rendezvous> = {};

    if (dto.newMedecinId != null) {
      const mid = Number(dto.newMedecinId);
      if (!Number.isFinite(mid) || mid <= 0) {
        throw new BadRequestException('Invalid newMedecinId');
      }
      partial.medecinId = mid;
    }

    if ((dto as any).patientId != null) {
      const pid = String((dto as any).patientId).trim();
      if (!pid) throw new BadRequestException('Invalid patientId');
      partial.patientId = pid;
    }

    if (dto.startTime) {
      const d = new Date(dto.startTime as unknown as string);
      if (isNaN(d.getTime())) throw new BadRequestException('Invalid startTime');
      partial.startTime = d;
      partial.status = RendezvousStatus.RESCHEDULED;
    }
    if (dto.endTime) {
      const d = new Date(dto.endTime as unknown as string);
      if (isNaN(d.getTime())) throw new BadRequestException('Invalid endTime');
      partial.endTime = d;
    }
    if (dto.type) partial.type = dto.type;

    const updated = this.repo.merge(rdv, partial);
    const saved = await this.repo.save(updated);

    if (dto.startTime) {
      await this.notifyReschedule(saved, (dto as any).patientName);
    }

    return saved;
  }

  async confirm(id: number, doctorName?: string) {
    const rdv = await this.repo.findOne({ where: { id } });
    if (!rdv) throw new NotFoundException('Rendezvous not found');
    rdv.status = RendezvousStatus.CONFIRMED;
    const saved = await this.repo.save(rdv);
    await this.notifyConfirm(saved, doctorName);
    return saved;
  }

  async cancel(id: number, doctorName?: string) {
    const rdv = await this.repo.findOne({ where: { id } });
    if (!rdv) throw new NotFoundException('Rendezvous not found');

    await this.markAvailable(rdv.medecinId, rdv.startTime.toISOString(), rdv.endTime.toISOString());

    rdv.status = RendezvousStatus.CANCELLED;
    const saved = await this.repo.save(rdv);
    await this.notifyCancel(saved, doctorName);
    return saved;
  }

  /* ----------------------------- READS ----------------------------- */

  async findOne(id: number) {
    const rdv = await this.repo.findOne({ where: { id } });
    if (!rdv) throw new NotFoundException('Rendezvous not found');
    return rdv;
  }

  async findAll(filters: { patientId?: string; medecinId?: number } = {}) {
    const qb = this.repo.createQueryBuilder('r');

    if (filters.patientId) {
      const pid = String(filters.patientId).trim();
      if (pid) qb.andWhere('r.patientId = :pid', { pid });
    }

    if (filters.medecinId != null) {
      const mid = Number(filters.medecinId);
      if (Number.isFinite(mid) && mid > 0) {
        qb.andWhere('r.medecinId = :mid', { mid });
      }
    }

    qb.orderBy('r.startTime', 'ASC');
    return qb.getMany();
  }

  async findAllByPatient(patientId: string) {
    const pid = String(patientId || '').trim();
    if (!pid) return [];

    return this.repo.find({
      where: { patientId: pid },
      order: { startTime: 'ASC' },
    });
  }

  async findAllByMedecin(medecinId: number) {
    const mid = Number(medecinId);
    if (!Number.isFinite(mid) || mid <= 0) return [];

    return this.repo.find({
      where: { medecinId: mid },
      order: { startTime: 'ASC' },
    });
  }

  /* --------- Raccourcis par périodes / statut --------- */

  private startOfToday(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  }

  private endOfToday(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  }

  private startOfWeek(): Date {
    const now = new Date();
    const day = now.getDay();
    const d = new Date(now);
    d.setDate(now.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private endOfWeek(): Date {
    const s = this.startOfWeek();
    const e = new Date(s);
    e.setDate(s.getDate() + 6);
    e.setHours(23, 59, 59, 999);
    return e;
  }

  private startOfMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  }

  private endOfMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  private async findByStatusBetween(status: RendezvousStatus, from: Date, to: Date) {
    return this.repo.find({
      where: { status, startTime: Between(from, to) },
      order: { startTime: 'ASC' },
    });
  }

  async findConfirmedToday() { return this.findByStatusBetween(RendezvousStatus.CONFIRMED, this.startOfToday(), this.endOfToday()); }
  async findConfirmedThisWeek() { return this.findByStatusBetween(RendezvousStatus.CONFIRMED, this.startOfWeek(), this.endOfWeek()); }
  async findConfirmedThisMonth() { return this.findByStatusBetween(RendezvousStatus.CONFIRMED, this.startOfMonth(), this.endOfMonth()); }

  async findScheduledToday() { return this.findByStatusBetween(RendezvousStatus.SCHEDULED, this.startOfToday(), this.endOfToday()); }
  async findScheduledThisWeek() { return this.findByStatusBetween(RendezvousStatus.SCHEDULED, this.startOfWeek(), this.endOfWeek()); }
  async findScheduledThisMonth() { return this.findByStatusBetween(RendezvousStatus.SCHEDULED, this.startOfMonth(), this.endOfMonth()); }

  async findRescheduledToday() { return this.findByStatusBetween(RendezvousStatus.RESCHEDULED, this.startOfToday(), this.endOfToday()); }
  async findRescheduledThisWeek() { return this.findByStatusBetween(RendezvousStatus.RESCHEDULED, this.startOfWeek(), this.endOfWeek()); }
  async findRescheduledThisMonth() { return this.findByStatusBetween(RendezvousStatus.RESCHEDULED, this.startOfMonth(), this.endOfMonth()); }

  async accept(id: number, doctorName?: string) {
    const rdv = await this.repo.findOne({ where: { id } });
    if (!rdv) throw new NotFoundException('Rendezvous not found');
    if (rdv.status !== RendezvousStatus.PENDING) {
      throw new BadRequestException('Only pending appointments can be accepted');
    }
    rdv.status = RendezvousStatus.SCHEDULED;
    const saved = await this.repo.save(rdv);
    
    // Send notification to patient
    try {
      const name = doctorName?.trim() ? `Dr. ${doctorName.trim()}` : 'the doctor';
      await firstValueFrom(
        this.notificationsClient.send('create_notification', {
          userId: rdv.patientId,
          userType: 'PATIENT',
          type: 'APPOINTMENT_CONFIRMED',
          message: `Your appointment request has been accepted by ${name}. Please proceed with payment.`,
        }),
      );
    } catch (e: any) {
      this.log.warn(`[RDV] notification failed: ${e?.message || e}`);
    }

    // Ensure payment exists just in case it wasn't created properly initially
    await firstValueFrom(
      this.paymentsClient.send('create_payment', {
        rendezvousId: saved.id,
        patientId: saved.patientId,
        amount: 50.0,
      })
    ).catch(err => this.log.warn(`[RDV] create_payment failed in accept: ${err?.message || err}`));

    return saved;
  }

  async confirmAfterPayment(rendezvousId: number) {
    const rdv = await this.repo.findOne({ where: { id: rendezvousId } });
    if (!rdv) {
      throw new NotFoundException('Rendezvous not found');
    }
    if (rdv.status !== RendezvousStatus.SCHEDULED) {
      throw new BadRequestException('Rendezvous cannot be confirmed (invalid status)');
    }
    rdv.status = RendezvousStatus.CONFIRMED;
    return this.repo.save(rdv);
  }

  async doctorReadyForConsultation(id: number, medecinId: number) {
    const rdv = await this.repo.findOne({ where: { id, medecinId } });
    if (!rdv) throw new NotFoundException('Rendezvous not found or unauthorized');
    
    if (rdv.status === RendezvousStatus.CANCELLED || rdv.status === RendezvousStatus.COMPLETED) {
      throw new BadRequestException('Cannot enter waiting room for cancelled/completed appointment');
    }

    rdv.doctorInWaitingRoom = true;
    rdv.doctorJoinedWaitingRoomAt = new Date();
    const saved = await this.repo.save(rdv);

    try {
      await firstValueFrom(
        this.notificationsClient.send('create_notification', {
          userId: rdv.patientId,
          userType: 'PATIENT',
          type: 'DOCTOR_READY',
          message: 'Your doctor has joined the waiting room. Click join to begin.',
        }),
      );
    } catch (e: any) {
      this.log.warn(`[RDV] create_notification failed: ${e?.message || e}`);
    }

    return saved;
  }

  async patientJoinConsultation(id: number) {
    const rdv = await this.repo.findOne({ where: { id } });
    if (!rdv) throw new NotFoundException('Rendezvous not found');

    // Allow joining if already IN_CONSULTATION (doctor started it)
    if (rdv.status === RendezvousStatus.IN_CONSULTATION) {
      return rdv;
    }

    if (!rdv.doctorInWaitingRoom) {
      throw new BadRequestException('Doctor has not joined yet. Please wait.');
    }

    rdv.status = RendezvousStatus.IN_CONSULTATION;
    if (!rdv.consultationStartedAt) {
      rdv.consultationStartedAt = new Date();
    }
    const saved = await this.repo.save(rdv);

    try {
      await firstValueFrom(
        this.notificationsClient.send('create_notification', {
          userId: rdv.patientId,
          userType: 'PATIENT',
          type: 'CONSULTATION_STARTED',
          message: 'Your consultation is now live.',
        }),
      );
      await firstValueFrom(
        this.notificationsClient.send('create_notification', {
          userId: String(rdv.medecinId),
          userType: 'DOCTOR',
          type: 'CONSULTATION_STARTED',
          message: 'Your consultation is now live.',
        }),
      );
    } catch (e: any) {
      this.log.warn(`[RDV] notification failed: ${e?.message || e}`);
    }

    return saved;
  }

  async endConsultation(id: number) {
    const rdv = await this.repo.findOne({ where: { id } });
    if (!rdv) throw new NotFoundException('Rendezvous not found');

    rdv.status = RendezvousStatus.COMPLETED;
    if (!rdv.consultationEndedAt) {
      rdv.consultationEndedAt = new Date();
    }
    const saved = await this.repo.save(rdv);

    try {
      await firstValueFrom(
        this.notificationsClient.send('create_notification', {
          userId: rdv.patientId,
          userType: 'PATIENT',
          type: 'CONSULTATION_ENDED',
          message: 'Your consultation has ended. Medical records will be available shortly.',
        }),
      );
    } catch (e: any) { }

    return saved;
  }

  /* -------------------- Patient Waiting Room -------------------- */

  async patientJoinWaitingRoom(id: number, patientId: string) {
    const rdv = await this.repo.findOne({ where: { id } });
    if (!rdv) throw new NotFoundException('Rendezvous not found');

    if (rdv.patientId !== patientId) {
      throw new BadRequestException('You are not the patient for this appointment');
    }

    if (rdv.status === RendezvousStatus.CANCELLED || rdv.status === RendezvousStatus.COMPLETED) {
      throw new BadRequestException('Cannot enter waiting room for cancelled/completed appointment');
    }

    rdv.patientInWaitingRoom = true;
    rdv.patientJoinedWaitingRoomAt = new Date();
    const saved = await this.repo.save(rdv);

    // Notify the doctor that patient has entered
    try {
      await firstValueFrom(
        this.notificationsClient.send('create_notification', {
          userId: String(rdv.medecinId),
          userType: 'DOCTOR',
          type: 'PATIENT_IN_WAITING_ROOM',
          message: 'Your patient has entered the waiting room.',
        }),
      );
    } catch (e: any) {
      this.log.warn(`[RDV] notification failed: ${e?.message || e}`);
    }

    return saved;
  }

  /* -------------------- Reschedule Request -------------------- */

  async requestReschedule(id: number, proposedStartTime: string, proposedEndTime: string) {
    const rdv = await this.repo.findOne({ where: { id } });
    if (!rdv) throw new NotFoundException('Rendezvous not found');

    const allowedStatuses = [
      RendezvousStatus.CONFIRMED,
      RendezvousStatus.SCHEDULED,
      RendezvousStatus.RESCHEDULED,
    ];
    if (!allowedStatuses.includes(rdv.status)) {
      throw new BadRequestException(`Cannot request reschedule for status: ${rdv.status}`);
    }

    const start = new Date(proposedStartTime);
    const end = new Date(proposedEndTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid proposed times');
    }

    rdv.proposedStartTime = start;
    rdv.proposedEndTime = end;
    rdv.rescheduleRequestedAt = new Date();
    rdv.status = RendezvousStatus.RESCHEDULE_REQUESTED;
    const saved = await this.repo.save(rdv);

    // Notify doctor
    try {
      const time = dayjs(start).format('MMM D, hh:mm A');
      await firstValueFrom(
        this.notificationsClient.send('create_notification', {
          userId: String(rdv.medecinId),
          userType: 'DOCTOR',
          type: 'RESCHEDULE_REQUESTED',
          message: `A patient has requested to reschedule their appointment to ${time}. Please review.`,
        }),
      );
    } catch (e: any) {
      this.log.warn(`[RDV] notification failed: ${e?.message || e}`);
    }

    return saved;
  }

  async acceptReschedule(id: number, doctorName?: string) {
    const rdv = await this.repo.findOne({ where: { id } });
    if (!rdv) throw new NotFoundException('Rendezvous not found');

    if (rdv.status !== RendezvousStatus.RESCHEDULE_REQUESTED) {
      throw new BadRequestException('No pending reschedule request');
    }

    if (!rdv.proposedStartTime || !rdv.proposedEndTime) {
      throw new BadRequestException('No proposed times found');
    }

    // Free up the old slot
    await this.markAvailable(rdv.medecinId, rdv.startTime.toISOString(), rdv.endTime.toISOString());

    // Move proposed times to actual
    rdv.startTime = rdv.proposedStartTime;
    rdv.endTime = rdv.proposedEndTime;
    rdv.proposedStartTime = null;
    rdv.proposedEndTime = null;
    rdv.rescheduleRequestedAt = null;
    rdv.status = RendezvousStatus.RESCHEDULED;

    // Mark new slot unavailable
    await this.markSlotUnavailableSafe(rdv.medecinId, rdv.startTime, rdv.endTime);

    const saved = await this.repo.save(rdv);

    // Notify patient
    try {
      const name = doctorName?.trim() ? `Dr. ${doctorName.trim()}` : 'Your doctor';
      const time = dayjs(saved.startTime).format('MMM D, hh:mm A');
      await firstValueFrom(
        this.notificationsClient.send('create_notification', {
          userId: rdv.patientId,
          userType: 'PATIENT',
          type: 'RESCHEDULE_ACCEPTED',
          message: `${name} has accepted your reschedule request. New time: ${time}`,
        }),
      );
    } catch (e: any) {
      this.log.warn(`[RDV] notification failed: ${e?.message || e}`);
    }

    return saved;
  }

  async declineReschedule(id: number, doctorName?: string) {
    const rdv = await this.repo.findOne({ where: { id } });
    if (!rdv) throw new NotFoundException('Rendezvous not found');

    if (rdv.status !== RendezvousStatus.RESCHEDULE_REQUESTED) {
      throw new BadRequestException('No pending reschedule request');
    }

    rdv.proposedStartTime = null;
    rdv.proposedEndTime = null;
    rdv.rescheduleRequestedAt = null;
    rdv.status = RendezvousStatus.CONFIRMED;
    const saved = await this.repo.save(rdv);

    // Notify patient
    try {
      const name = doctorName?.trim() ? `Dr. ${doctorName.trim()}` : 'Your doctor';
      await firstValueFrom(
        this.notificationsClient.send('create_notification', {
          userId: rdv.patientId,
          userType: 'PATIENT',
          type: 'RESCHEDULE_DECLINED',
          message: `${name} has declined your reschedule request. Your original appointment remains unchanged.`,
        }),
      );
    } catch (e: any) {
      this.log.warn(`[RDV] notification failed: ${e?.message || e}`);
    }

    return saved;
  }

  /** Auto-decline reschedule requests older than 24h (check-on-read). */
  async autoDeclineExpiredReschedules() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const expired = await this.repo
      .createQueryBuilder('r')
      .where('r.status = :status', { status: RendezvousStatus.RESCHEDULE_REQUESTED })
      .andWhere('r.rescheduleRequestedAt < :cutoff', { cutoff })
      .getMany();

    for (const rdv of expired) {
      rdv.proposedStartTime = null;
      rdv.proposedEndTime = null;
      rdv.rescheduleRequestedAt = null;
      rdv.status = RendezvousStatus.CONFIRMED;
      await this.repo.save(rdv);

      try {
        await firstValueFrom(
          this.notificationsClient.send('create_notification', {
            userId: rdv.patientId,
            userType: 'PATIENT',
            type: 'RESCHEDULE_DECLINED',
            message: 'Your reschedule request has expired (no response in 24 hours). Your original appointment remains unchanged.',
          }),
        );
      } catch (e: any) {
        this.log.warn(`[RDV] auto-decline notification failed: ${e?.message || e}`);
      }
    }

    return expired.length;
  }
}