import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  BadRequestException,
  UseInterceptors,
  UploadedFiles,
  Patch,
  Delete,
  UseGuards,
  ParseIntPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ApiTags, ApiBody, ApiConsumes, ApiOperation, ApiOkResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import * as FormData from 'form-data';
import { AuthGuard } from '@nestjs/passport';
import { JwtDoctorGuard } from 'src/common/guards/jwt-doctor.guard';
import { JwtPatientOrDoctorGuard } from 'src/common/guards/jwt-patient-or-doctor.guard';

@ApiTags('RegisterDoctor')
@Controller('register-doctors')
export class GatewayRegisterDoctorController {
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const url = this.configService.get<string>('REGISTER_DOCTOR_MS');
    if (!url) {
      throw new Error('REGISTER_DOCTOR_MS environment variable is not set');
    }
    this.baseUrl = url;
  }

  /** ========== HELPER: EXTRACT TOKEN ========== */
  private extractToken(req: Request): string | undefined {
    return req.cookies?.accessToken || 
           req.headers.authorization?.replace('Bearer ', '');
  }

  /** ========== CREATE DOCTOR ========== */
  @Post()
  @UseInterceptors(AnyFilesInterceptor({ storage: memoryStorage() }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Register a new doctor with documents' })
  @ApiBody({
    description: 'Doctor registration with images',
    schema: {
      type: 'object',
      properties: {
        fullName: { type: 'string', example: 'Dr. Kaouthar Messous' },
        email: { type: 'string', example: 'kaouthar@example.com' },
        phone: { type: 'string', example: '+21612345678' },
        password: { type: 'string', example: 'password123' },
        confirmPassword: { type: 'string', example: 'password123' },
        specialty: { type: 'string', example: 'Cardiology' },
        experience: { type: 'number', example: 5 },
        practicePlace: { type: 'string', example: 'City Hospital' },
        country: { type: 'string', example: 'Tunisia' },
        city: { type: 'string', example: 'Tunis' },
        clinicAddress: { type: 'string', example: '123 sousse khzema' },
        licenceImg: { type: 'string', format: 'binary' },
        identityImg: { type: 'string', format: 'binary' },
      },
      required: [
        'fullName','email','phone','password','confirmPassword','specialty','experience',
        'practicePlace','country','city','clinicAddress','licenceImg','identityImg'
      ],
    },
  })
  async create(
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Fichiers manquants');
    }

    const licenceFile = files.find(f => f.fieldname === 'licenceImg');
    const identityFile = files.find(f => f.fieldname === 'identityImg');

    if (!licenceFile || !identityFile) {
      throw new BadRequestException('Missing required files');
    }

    if (body.password !== body.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    if (!body.password || body.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    if (isNaN(Number(body.experience))) {
      throw new BadRequestException('Experience must be a number');
    }

    const allDoctors = await firstValueFrom(this.httpService.get(`${this.baseUrl}`));
    const emailExists = allDoctors.data.some((doc: any) => doc.email === body.email);
    if (emailExists) {
      throw new BadRequestException('Email already in use');
    }

    const formData = new FormData();
    Object.keys(body).forEach(key => formData.append(key, body[key]));
    files.forEach(file => {
      formData.append(file.fieldname, file.buffer, { filename: file.originalname });
    });

    const response = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}`, formData, {
        headers: formData.getHeaders(),
      }),
    );

    return response.data;
  }

  /** ========== GET CURRENT DOCTOR ========== */
  @Get('me')
  @UseGuards(JwtDoctorGuard)
  async getMe(@Req() req: Request) {
    try {
      const doctor = req.user as { doctorId: string; email: string; role: string };
      
      if (!doctor?.doctorId) {
        throw new BadRequestException('Doctor ID missing in token');
      }

      const token = this.extractToken(req);
      if (!token) {
        throw new BadRequestException('Authentication token missing');
      }

      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/${doctor.doctorId}`, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
      );

      const data = response.data;

      return {
        id: String(data.id ?? data._id ?? data.doctorId ?? ''),
        fullName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        email: data.email || '',
        phone: data.phone || '',
        specialty: data.specialty || '',
        city: data.city || '',
        country: data.country || '',
        birthDate: data.birthDate || '',
        avatarUrl: data.avatar || data.photo || data.identityImg || null,
        // Include notification preferences if they exist
        appointmentReminders: data.appointmentReminders ?? true,
        medicationReminders: data.medicationReminders ?? true,
        messageAlerts: data.messageAlerts ?? true,
        questionUpdates: data.questionUpdates ?? true,
        useLocation: data.useLocation ?? true,
        raw: data,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new HttpException(
        error?.response?.data?.message || 'Failed to fetch doctor profile',
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /** ========== GET ALL DOCTORS ========== */
  @Get()
    @UseGuards(JwtPatientOrDoctorGuard)
  
  async findAll(@Req() req: Request) {
    const token = this.extractToken(req);
    const response = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}`, {
        headers: {
          Accept: 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
      })
    );
    return response.data;
  }

  /** ========== GET DOCTOR BY ID ========== */
  @Get(':id')
  @UseGuards(JwtPatientOrDoctorGuard)

  async findOne(@Param('id') id: string, @Req() req: Request) {
    if (!id) throw new BadRequestException('ID requis');

    const token = this.extractToken(req);

    const response = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}/${id}`, {
        headers: {
          Accept: 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
      })
    );
    return response.data;
  }

  /** ========== ADD DOCTOR REVIEW ========== */
  @Post(':id/reviews')
  @UseGuards(JwtPatientOrDoctorGuard)
  @ApiOperation({ summary: 'Add a review for a doctor' })
  async addReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Req() req: Request,
  ) {
    const token = this.extractToken(req);

    const response = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}/${id}/reviews`, body, {
        headers: {
          Accept: 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
      }),
    );
    return response.data;
  }

  /** ========== UPDATE DOCTOR ========== */
  @Patch(':id')
  @UseGuards(JwtDoctorGuard)
  @UseInterceptors(AnyFilesInterceptor({ storage: memoryStorage() }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update doctor information (authenticated)' })
  async updateDoctor(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any,
    @Req() req: Request,
  ) {
    if (!body || Object.keys(body).length === 0) {
      throw new BadRequestException('Aucune donnée envoyée pour la mise à jour');
    }

    const token = this.extractToken(req);
    const formData = new FormData();

    for (const key in body) {
      if (body[key] !== undefined && body[key] !== null) {
        formData.append(key, body[key]);
      }
    }

    if (files && files.length > 0) {
      files.forEach((file) => {
        formData.append(file.fieldname, file.buffer, file.originalname);
      });
    }

    const response = await firstValueFrom(
      this.httpService.patch(`${this.baseUrl}/${id}`, formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: token ? `Bearer ${token}` : '',
        },
      }),
    );
    return response.data;
  }

  /** ========== DELETE DOCTOR ========== */
  @Delete(':id')
  @UseGuards(JwtDoctorGuard)
  async remove(@Param('id') id: string, @Req() req: Request) {
    if (!id) throw new BadRequestException('ID requis');

    const token = this.extractToken(req);

    const response = await firstValueFrom(
      this.httpService.delete(`${this.baseUrl}/${id}`, {
        headers: {
          Accept: 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
      })
    );
    return response.data;
  }

  /** ========== SEARCH DOCTORS BY FULLNAME ========== */
  @Get('search/:fullName')
  @UseGuards(JwtPatientOrDoctorGuard)
  async searchByFullName(@Param('fullName') fullName: string) {
    if (!fullName) throw new BadRequestException('FullName requis');

    const response = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}/search/${fullName}`)
    );
    return response.data;
  }
}