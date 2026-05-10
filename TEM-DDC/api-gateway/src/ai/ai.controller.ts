import { Controller, Get, Param, UseGuards, Req, UnauthorizedException, HttpException, HttpStatus, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiParam } from '@nestjs/swagger';
import { JwtPatientOrDoctorGuard } from '../common/guards/jwt-patient-or-doctor.guard';
import { firstValueFrom } from 'rxjs';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtPatientOrDoctorGuard)
@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(
    @Inject('AI_SERVICE') private readonly aiServiceClient: ClientProxy,
    @Inject('MEDICAL_RECORDS_SERVICE') private readonly medicalRecordsClient: ClientProxy,
  ) {}

  @ApiOperation({ summary: 'Generate a comprehensive medical history summary for a patient' })
  @ApiParam({ name: 'patientId', type: 'string', description: 'Patient ID' })
  @Get('patient/:patientId/summary')
  async summarizePatientRecords(@Req() req: any, @Param('patientId') patientId: string) {
    const user = req.user;
    
    if (user.userType === 'PATIENT' && user.userId !== patientId) {
      this.logger.warn(`Patient ${user.userId} attempted to access records of patient ${patientId}`);
      throw new UnauthorizedException('Patients can only summarize their own records');
    }

    try {
      this.logger.log(`Fetching medical records for patient ${patientId}`);
      // Call ms-medical-records
      const records = await firstValueFrom(
        this.medicalRecordsClient.send('get_records_by_patient', { patientId })
      );

      if (!records || records.length === 0) {
        return { summary: "No medical records found for this patient" };
      }

      this.logger.log(`Sending ${records.length} records to AI service for summarization`);
      // Call ms-ai
      const result = await firstValueFrom(
        this.aiServiceClient.send('summarize_medical_records', { records })
      );

      return result;
    } catch (error: any) {
      this.logger.error(`Error in summarizePatientRecords: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Error communicating with microservices',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @ApiOperation({ summary: 'Generate a concise clinical note for a single consultation record' })
  @ApiParam({ name: 'recordId', type: 'string', description: 'Medical Record ID' })
  @Get('record/:recordId/summary')
  async summarizeSingleRecord(@Req() req: any, @Param('recordId') recordId: string) {
    const user = req.user;

    try {
      this.logger.log(`Fetching medical record ${recordId}`);
      // Call ms-medical-records
      const record = await firstValueFrom(
        this.medicalRecordsClient.send('get_record_by_id', { recordId })
      );

      if (!record) {
        throw new HttpException('Medical record not found', HttpStatus.NOT_FOUND);
      }

      if (user.userType === 'PATIENT' && record.patientId !== user.userId) {
        this.logger.warn(`Patient ${user.userId} attempted to access record ${recordId} of another patient`);
        throw new UnauthorizedException('Patients can only summarize their own records');
      }

      this.logger.log(`Sending record ${recordId} to AI service for summarization`);
      // Call ms-ai
      const result = await firstValueFrom(
        this.aiServiceClient.send('summarize_single_record', { record })
      );

      return result;
    } catch (error: any) {
      this.logger.error(`Error in summarizeSingleRecord: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Error communicating with microservices',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
