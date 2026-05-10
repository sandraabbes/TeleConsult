import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ConsultationEntity } from './consultation.entity';
import { ConsultationStatus } from '../common/enums/consultation-status.enum';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { JoinConsultationDto } from './dto/join-consultation.dto';
import { generateRoomId } from '../utils/generate-room-id';
import { formatDateISO } from '../utils/date.util';

@Injectable()
export class ConsultationService {
  private readonly logger = new Logger(ConsultationService.name);

  constructor(
    @InjectRepository(ConsultationEntity)
    private readonly consultationRepo: Repository<ConsultationEntity>,
    @Inject('NOTIFICATIONS_SERVICE')
    private readonly notificationsClient: ClientProxy,
    @Inject('MEDICAL_RECORDS_SERVICE')
    private readonly medicalRecordsClient: ClientProxy,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateConsultationDto): Promise<ConsultationEntity> {
    const roomId = generateRoomId();
    const consultation = this.consultationRepo.create({
      roomId,
      doctorId: dto.doctorId,
      patientId: null,
      status: ConsultationStatus.SCHEDULED,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
    });
    return this.consultationRepo.save(consultation);
  }

  async findAll(): Promise<ConsultationEntity[]> {
    return this.consultationRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findByRoomId(roomId: string): Promise<ConsultationEntity> {
    const consultation = await this.consultationRepo.findOne({ where: { roomId } });
    if (!consultation) {
      throw new NotFoundException(`Consultation with room ${roomId} not found`);
    }
    return consultation;
  }

  /**
   * Find a consultation by roomId, or auto-create one using the roomId
   * (which is typically the appointmentId from the frontend).
   * This handles the case where the frontend navigates directly to a
   * consultation room without explicitly creating a consultation record.
   */
  async findOrCreateByRoomId(roomId: string): Promise<ConsultationEntity> {
    let consultation = await this.consultationRepo.findOne({ where: { roomId } });
    if (!consultation) {
      this.logger.log(`Consultation not found for room ${roomId}, auto-creating...`);
      consultation = this.consultationRepo.create({
        roomId,
        doctorId: 0, // Will be updated when participants join via socket
        patientId: null,
        status: ConsultationStatus.SCHEDULED,
        scheduledAt: new Date(),
      });
      consultation = await this.consultationRepo.save(consultation);
    }
    return consultation;
  }

  async join(dto: JoinConsultationDto): Promise<ConsultationEntity> {
    // Use findOrCreate so joining never fails due to missing record
    let consultation: ConsultationEntity;
    try {
      consultation = await this.findByRoomId(dto.roomId);
    } catch (e) {
      consultation = await this.findOrCreateByRoomId(dto.roomId);
    }

    if (consultation.patientId && consultation.patientId !== dto.patientId) {
      throw new BadRequestException('Room already has a different patient');
    }
    consultation.patientId = dto.patientId;
    if (consultation.status === ConsultationStatus.SCHEDULED) {
      consultation.status = ConsultationStatus.WAITING;
    }
    return this.consultationRepo.save(consultation);
  }

  async startConsultation(roomId: string): Promise<ConsultationEntity> {
    const consultation = await this.findOrCreateByRoomId(roomId);
    if (consultation.status === ConsultationStatus.IN_PROGRESS) {
      return consultation; // Already started, return as-is
    }
    consultation.status = ConsultationStatus.IN_PROGRESS;
    consultation.startedAt = new Date();
    return this.consultationRepo.save(consultation);
  }

  async endConsultation(roomId: string, _reason?: string): Promise<ConsultationEntity> {
    let consultation: ConsultationEntity;
    try {
      consultation = await this.findByRoomId(roomId);
    } catch (e) {
      // If no consultation record exists, create one and mark as ended
      consultation = await this.findOrCreateByRoomId(roomId);
    }

    if (consultation.status === ConsultationStatus.ENDED || consultation.status === ConsultationStatus.CANCELLED) {
      // Already ended — return gracefully instead of throwing
      return consultation;
    }
    consultation.status = ConsultationStatus.ENDED;
    consultation.endedAt = new Date();
    const saved = await this.consultationRepo.save(consultation);

    // Synchronize with Rendezvous MS (direct call to ms-rendez-vous on port 3005)
    try {
      const rendezvousUrl = this.configService.get('RENDEZVOUS_SERVICE_URL') || 'http://localhost:3005/rendezvous';
      await firstValueFrom(
        this.httpService.post(`${rendezvousUrl}/${roomId}/end`, {})
      );
      this.logger.log(`[Consultation] Successfully synced end status for room ${roomId} to Rendezvous MS`);
    } catch (e) {
      this.logger.warn(`[Consultation] Failed to sync end status to Rendezvous MS: ${e.message}`);
    }

    await this.notifyConsultationEnded(saved);
    this.createMedicalRecordNonBlocking(saved);
    return saved;
  }

  private createMedicalRecordNonBlocking(
    consultation: ConsultationEntity,
  ): void {
    if (!consultation.patientId || !consultation.doctorId) return;
    try {
      firstValueFrom(
        this.medicalRecordsClient.send('create_medical_record', {
          patientId: consultation.patientId,
          doctorId: consultation.doctorId,
          rendezvousId: Number(consultation.roomId), // Use roomId as rendezvousId
          consultationDate: consultation.endedAt?.toISOString() ?? new Date().toISOString(),
          notes: null,
          diagnosis: null,
          attachmentUrls: [],
          prescriptions: [],
        }),
      ).catch((e) => {
        this.logger.warn(
          `create_medical_record failed: ${(e as Error)?.message || e}`,
        );
      });
    } catch (e) {
      this.logger.warn(
        `create_medical_record failed: ${(e as Error)?.message || e}`,
      );
    }
  }

  private async notifyConsultationEnded(
    consultation: ConsultationEntity,
  ): Promise<void> {
    const message = 'Your consultation has ended';
    try {
      const promises: Promise<unknown>[] = [];
      if (consultation.doctorId) {
        promises.push(
          firstValueFrom(
            this.notificationsClient.send('create_notification', {
              userId: consultation.doctorId,
              userType: 'DOCTOR',
              type: 'CONSULTATION_ENDED',
              message,
            }),
          ),
        );
      }
      if (consultation.patientId) {
        promises.push(
          firstValueFrom(
            this.notificationsClient.send('create_notification', {
              userId: consultation.patientId,
              userType: 'PATIENT',
              type: 'CONSULTATION_ENDED',
              message,
            }),
          ),
        );
      }
      await Promise.all(promises);
    } catch (e: unknown) {
      const err = e as Error;
      console.warn(`[Consultation] notifyConsultationEnded failed: ${err?.message || e}`);
    }
  }

  toResponseDto(entity: ConsultationEntity): Record<string, unknown> {
    return {
      id: entity.id,
      roomId: entity.roomId,
      doctorId: entity.doctorId,
      patientId: entity.patientId,
      status: entity.status,
      scheduledAt: entity.scheduledAt ? formatDateISO(entity.scheduledAt) : null,
      startedAt: entity.startedAt ? formatDateISO(entity.startedAt) : null,
      endedAt: entity.endedAt ? formatDateISO(entity.endedAt) : null,
      createdAt: formatDateISO(entity.createdAt),
      updatedAt: formatDateISO(entity.updatedAt),
    };
  }
}
