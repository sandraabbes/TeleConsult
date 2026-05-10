import {
  Injectable,
  NotFoundException,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { MedicalRecordEntity } from './entities/medical-record.entity';
import { PrescriptionEntity } from '../prescription/entities/prescription.entity';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';
import { PrescriptionInputDto } from '../prescription/dto/prescription-input.dto';

@Injectable()
export class MedicalRecordService {
  private readonly logger = new Logger(MedicalRecordService.name);

  constructor(
    @InjectRepository(MedicalRecordEntity)
    private readonly medicalRecordRepo: Repository<MedicalRecordEntity>,
    @InjectRepository(PrescriptionEntity)
    private readonly prescriptionRepo: Repository<PrescriptionEntity>,
    @Inject('NOTIFICATIONS_SERVICE')
    private readonly notificationsClient: ClientProxy,
  ) {}

  async create(dto: CreateMedicalRecordDto): Promise<MedicalRecordEntity> {
    const record = this.medicalRecordRepo.create({
      patientId: dto.patientId,
      doctorId: dto.doctorId,
      rendezvousId: dto.rendezvousId,
      consultationDate: new Date(dto.consultationDate),
      notes: dto.notes ?? null,
      diagnosis: dto.diagnosis ?? null,
      attachments: dto.attachments ?? null,
    });

    const saved = await this.medicalRecordRepo.manager.transaction(
      async (em) => {
        const savedRecord = await em.save(MedicalRecordEntity, record);
        const prescriptions = (dto.prescriptions ?? []).map((p) =>
          this.prescriptionRepo.create({
            medicalRecordId: savedRecord.id,
            medicationName: p.medicationName,
            dosage: p.dosage,
            frequency: p.frequency,
            duration: p.duration,
            notes: p.notes ?? null,
          }),
        );
        if (prescriptions.length > 0) {
          await em.save(PrescriptionEntity, prescriptions);
        }
        return em.findOne(MedicalRecordEntity, {
          where: { id: savedRecord.id },
          relations: ['prescriptions'],
        });
      },
    );

    if (!saved) {
      throw new Error('Failed to load saved record');
    }

    this.notifyPatientNonBlocking(saved.patientId);
    return saved;
  }

  private notifyPatientNonBlocking(patientId: string): void {
    try {
      this.notificationsClient
        .send('create_notification', {
          userId: patientId,
          userType: 'PATIENT',
          type: 'CONSULTATION_ENDED',
          message:
            'Your doctor has added a medical record for your consultation',
        })
        .subscribe({
          error: (err) => {
            this.logger.warn(
              `Failed to send notification to patient ${patientId}: ${err?.message || err}`,
            );
          },
        });
    } catch (e) {
      const err = e as Error;
      this.logger.warn(
        `Failed to send notification to patient ${patientId}: ${err?.message || e}`,
      );
    }
  }

  async getRecordsByPatient(patientId: string): Promise<MedicalRecordEntity[]> {
    return this.medicalRecordRepo.find({
      where: { patientId },
      relations: ['prescriptions'],
      order: { consultationDate: 'DESC' },
    });
  }

  async getRecordsByDoctor(doctorId: number): Promise<MedicalRecordEntity[]> {
    return this.medicalRecordRepo.find({
      where: { doctorId },
      relations: ['prescriptions'],
      order: { consultationDate: 'DESC' },
    });
  }

  async getRecordById(recordId: string): Promise<MedicalRecordEntity> {
    const record = await this.medicalRecordRepo.findOne({
      where: { id: recordId },
      relations: ['prescriptions'],
    });
    if (!record) {
      throw new NotFoundException(`Medical record ${recordId} not found`);
    }
    return record;
  }

  async getRecordByRendezvous(rendezvousId: number): Promise<MedicalRecordEntity | null> {
    return this.medicalRecordRepo.findOne({
      where: { rendezvousId },
      relations: ['prescriptions'],
    });
  }

  async update(dto: UpdateMedicalRecordDto): Promise<MedicalRecordEntity> {
    const record = await this.getRecordById(dto.recordId);
    if (dto.notes !== undefined) record.notes = dto.notes;
    if (dto.diagnosis !== undefined) record.diagnosis = dto.diagnosis;
    if (dto.attachments !== undefined) {
      record.attachments = dto.attachments;
    }

    await this.medicalRecordRepo.manager.transaction(async (em) => {
      await em.save(MedicalRecordEntity, record);

      if (dto.prescriptions !== undefined) {
        // Delete old prescriptions linked to this record
        await em.delete(PrescriptionEntity, { medicalRecordId: record.id });

        // Insert fresh prescriptions
        if (dto.prescriptions.length > 0) {
          const newPrescriptions = dto.prescriptions.map((p) =>
            em.create(PrescriptionEntity, {
              medicalRecordId: record.id,
              medicationName: p.medicationName,
              dosage: p.dosage,
              frequency: p.frequency,
              duration: p.duration,
              notes: p.notes ?? null,
            }),
          );
          await em.save(PrescriptionEntity, newPrescriptions);
        }
      }
    });

    return this.getRecordById(dto.recordId);
  }

  async addPrescription(
    recordId: string,
    prescription: PrescriptionInputDto,
  ): Promise<PrescriptionEntity> {
    const record = await this.getRecordById(recordId);
    const entity = this.prescriptionRepo.create({
      medicalRecordId: record.id,
      medicationName: prescription.medicationName,
      dosage: prescription.dosage,
      frequency: prescription.frequency,
      duration: prescription.duration,
      notes: prescription.notes ?? null,
    });
    return this.prescriptionRepo.save(entity);
  }

  async deletePrescription(prescriptionId: string): Promise<void> {
    const result = await this.prescriptionRepo.delete(prescriptionId);
    if (result.affected === 0) {
      throw new NotFoundException(`Prescription ${prescriptionId} not found`);
    }
  }
}
