import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpException,
  HttpStatus,
  ForbiddenException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { JwtDoctorGuard } from '../common/guards/jwt-doctor.guard';
import { JwtPatientOrDoctorGuard } from '../common/guards/jwt-patient-or-doctor.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

interface JwtUser {
  sub?: string;
  doctorId?: string;
}

@ApiTags('Medical Records')
@ApiBearerAuth()
@Controller('medical-records')
export class MedicalRecordsGatewayController {
  private readonly medicalRecordsClient: ClientProxy;

  constructor(private readonly config: ConfigService) {
    const host =
      this.config.get<string>('MEDICAL_RECORDS_SERVICE_HOST') || 'localhost';
    const portRaw = this.config.get<string | number>(
      'MEDICAL_RECORDS_SERVICE_PORT',
    );
    const port =
      typeof portRaw === 'number'
        ? portRaw
        : parseInt(String(portRaw || '4006'), 10);
    this.medicalRecordsClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: { host, port },
    });
  }

  private getUserIdAndType(req: any): {
    userId: string;
    userType: 'DOCTOR' | 'PATIENT';
  } {
    const user = req.user as JwtUser;
    if (!user) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    if (user.doctorId) {
      return { userId: String(user.doctorId), userType: 'DOCTOR' };
    }
    if (user.sub) {
      return { userId: String(user.sub), userType: 'PATIENT' };
    }
    throw new HttpException('Invalid user context', HttpStatus.UNAUTHORIZED);
  }

  @Post()
  @UseGuards(JwtDoctorGuard)
  @ApiOperation({ summary: 'Create a medical record (doctors only)' })
  async create(@Body() body: Record<string, any>) {
    try {
      return await firstValueFrom(
        this.medicalRecordsClient.send('create_medical_record', body),
      );
    } catch (e: any) {
      throw new HttpException(
        e?.message || 'Failed to create medical record',
        e?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('patient/:patientId')
  @UseGuards(JwtPatientOrDoctorGuard)
  @ApiOperation({ summary: 'Get medical records by patient (patient or doctor)' })
  async getByPatient(@Req() req: any, @Param('patientId') patientId: string) {
    const { userType, userId } = this.getUserIdAndType(req);
    if (userType === 'PATIENT' && userId !== patientId) {
      throw new ForbiddenException('You can only view your own records');
    }
    try {
      return await firstValueFrom(
        this.medicalRecordsClient.send('get_records_by_patient', { patientId }),
      );
    } catch (e: any) {
      throw new HttpException(
        e?.message || 'Failed to fetch records',
        e?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('doctor/:doctorId')
  @UseGuards(JwtDoctorGuard)
  @ApiOperation({ summary: 'Get medical records by doctor (doctors only)' })
  async getByDoctor(@Param('doctorId') doctorId: string) {
    try {
      return await firstValueFrom(
        this.medicalRecordsClient.send('get_records_by_doctor', {
          doctorId: parseInt(doctorId, 10),
        }),
      );
    } catch (e: any) {
      throw new HttpException(
        e?.message || 'Failed to fetch records',
        e?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('rendezvous/:rendezvousId')
  @UseGuards(JwtPatientOrDoctorGuard)
  @ApiOperation({ summary: 'Get medical record by rendezvous/consultation ID' })
  async getByRendezvous(@Param('rendezvousId') rendezvousId: string) {
    try {
      const record = await firstValueFrom(
        this.medicalRecordsClient.send('get_record_by_rendezvous', {
          rendezvousId: parseInt(rendezvousId, 10),
        }),
      );
      return record;
    } catch (e: any) {
      throw new HttpException(
        e?.message || 'Failed to fetch record',
        e?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @UseGuards(JwtPatientOrDoctorGuard)
  @ApiOperation({ summary: 'Get medical record by ID (patient or doctor)' })
  async getById(@Req() req: any, @Param('id') id: string) {
    const { userType, userId } = this.getUserIdAndType(req);
    try {
      const record = await firstValueFrom(
        this.medicalRecordsClient.send('get_record_by_id', { recordId: id }),
      );
      if (!record) {
        throw new HttpException('Record not found', HttpStatus.NOT_FOUND);
      }
      if (userType === 'PATIENT' && record.patientId !== userId) {
        throw new ForbiddenException('You can only view records that belong to you');
      }
      return record;
    } catch (e: any) {
      if (e instanceof ForbiddenException) throw e;
      throw new HttpException(
        e?.message || 'Failed to fetch record',
        e?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  @UseGuards(JwtDoctorGuard)
  @ApiOperation({ summary: 'Update medical record (doctors only)' })
  async update(@Param('id') id: string, @Body() body: Record<string, any>) {
    try {
      return await firstValueFrom(
        this.medicalRecordsClient.send('update_medical_record', {
          recordId: id,
          ...body,
        }),
      );
    } catch (e: any) {
      throw new HttpException(
        e?.message || 'Failed to update record',
        e?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/prescriptions')
  @UseGuards(JwtDoctorGuard)
  @ApiOperation({ summary: 'Add prescription to medical record (doctors only)' })
  async addPrescription(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    try {
      return await firstValueFrom(
        this.medicalRecordsClient.send('add_prescription', {
          recordId: id,
          ...body,
        }),
      );
    } catch (e: any) {
      throw new HttpException(
        e?.message || 'Failed to add prescription',
        e?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('prescriptions/:prescriptionId')
  @UseGuards(JwtDoctorGuard)
  @ApiOperation({ summary: 'Delete prescription (doctors only)' })
  async deletePrescription(@Param('prescriptionId') prescriptionId: string) {
    try {
      return await firstValueFrom(
        this.medicalRecordsClient.send('delete_prescription', {
          prescriptionId,
        }),
      );
    } catch (e: any) {
      throw new HttpException(
        e?.message || 'Failed to delete prescription',
        e?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/upload')
  @UseGuards(JwtDoctorGuard)
  @ApiOperation({ summary: 'Upload an attachment to a medical record' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = './uploads/medical-records';
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only PDF and images are allowed'), false);
        }
      },
    }),
  )
  async uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new HttpException('File is required', HttpStatus.BAD_REQUEST);
    }

    const fileUrl = `/uploads/medical-records/${file.filename}`;

    try {
      const record = await firstValueFrom(
        this.medicalRecordsClient.send('get_record_by_id', { recordId: id }),
      );
      if (!record) throw new HttpException('Record not found', HttpStatus.NOT_FOUND);

      const newAttachment = {
        uid: file.filename,
        name: file.originalname,
        url: fileUrl,
        status: 'done',
        type: file.mimetype,
      };

      const updatedAttachments = [...(record.attachments || []), newAttachment];

      await firstValueFrom(
        this.medicalRecordsClient.send('update_medical_record', {
          recordId: id,
          attachments: updatedAttachments,
        }),
      );

      return {
        message: 'File uploaded successfully',
        url: fileUrl,
      };
    } catch (e: any) {
      throw new HttpException(
        e?.message || 'Failed to update record with attachment',
        e?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}