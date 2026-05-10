import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MedicalRecordService } from './medical-record.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';
import {
  GetRecordsByPatientDto,
  GetRecordsByDoctorDto,
  GetRecordByIdDto,
} from './dto/get-records.dto';
import { GetRecordByRendezvousDto } from './dto/get-record-by-rendezvous.dto';
import { AddPrescriptionDto } from './dto/add-prescription.dto';
import { DeletePrescriptionDto } from './dto/delete-prescription.dto';

@Controller()
export class MedicalRecordController {
  constructor(private readonly medicalRecordService: MedicalRecordService) {}

  @MessagePattern('create_medical_record')
  async create(@Payload() dto: CreateMedicalRecordDto) {
    return this.medicalRecordService.create(dto);
  }

  @MessagePattern('get_records_by_patient')
  async getRecordsByPatient(@Payload() dto: GetRecordsByPatientDto) {
    return this.medicalRecordService.getRecordsByPatient(dto.patientId);
  }

  @MessagePattern('get_records_by_doctor')
  async getRecordsByDoctor(@Payload() dto: GetRecordsByDoctorDto) {
    return this.medicalRecordService.getRecordsByDoctor(dto.doctorId);
  }

  @MessagePattern('get_record_by_id')
  async getRecordById(@Payload() dto: GetRecordByIdDto) {
    return this.medicalRecordService.getRecordById(dto.recordId);
  }

  @MessagePattern('get_record_by_rendezvous')
  async getRecordByRendezvous(@Payload() dto: GetRecordByRendezvousDto) {
    return this.medicalRecordService.getRecordByRendezvous(dto.rendezvousId);
  }

  @MessagePattern('update_medical_record')
  async update(@Payload() dto: UpdateMedicalRecordDto) {
    return this.medicalRecordService.update(dto);
  }

  @MessagePattern('add_prescription')
  async addPrescription(@Payload() dto: AddPrescriptionDto) {
    const { recordId, ...prescription } = dto;
    return this.medicalRecordService.addPrescription(recordId, prescription);
  }

  @MessagePattern('delete_prescription')
  async deletePrescription(@Payload() dto: DeletePrescriptionDto) {
    await this.medicalRecordService.deletePrescription(dto.prescriptionId);
    return { success: true };
  }
}
