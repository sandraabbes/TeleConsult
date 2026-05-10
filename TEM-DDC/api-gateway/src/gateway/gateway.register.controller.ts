// src/users/users-gateway.controller.ts
import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  HttpException,
  HttpStatus,
  Put,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { JwtPatientGuard } from 'src/common/guards/jwt-patient.guard';
import { CurrentPatient } from 'src/common/decorators/current-patient.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { JwtPatientOrDoctorGuard } from 'src/common/guards/jwt-patient-or-doctor.guard';

@ApiTags('Users/Patients (Gateway)')
@Controller('users')
export class UsersGatewayController {
  constructor(private readonly httpService: HttpService) {}

  private usersServiceUrl =
    process.env.USERS_SERVICE_URL ;

  // ✅ Helper pour extraire le token des cookies ou du header Authorization
  private extractToken(req: Request): string | undefined {
    return req.cookies?.accessToken || 
           req.headers.authorization?.replace('Bearer ', '');
  }

  /** ========== REGISTER ========== */
  @Post('register')
  @ApiOperation({ summary: 'Register new patient', description: 'Create a new patient account' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string', example: 'John' },
        lastName: { type: 'string', example: 'Doe' },
        email: { type: 'string', example: 'patient@example.com' },
        password: { type: 'string', example: 'password123' },
        confirmPassword: { type: 'string', example: 'password123' },
        phone: { type: 'string', example: '+21612345678' },
        dateOfBirth: { type: 'string', format: 'date', example: '1990-01-01' },
      },
      required: ['firstName', 'lastName', 'email', 'password', 'confirmPassword'],
    },
  })
  @ApiOkResponse({ description: 'Registered successfully' })
  @ApiBadRequestResponse({ description: 'Invalid data or email already exists' })
  async registerUser(@Body() registerDto: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.usersServiceUrl}/register`, registerDto, {
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        }),
      );
      return response.data;
    } catch (error) {
      throw new HttpException(
        error.response?.data || 'Internal Server Error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /** ========== GET CURRENT USER ========== */
  @Get('me')
  @UseGuards(JwtPatientGuard)
  @ApiOperation({ summary: 'Get current patient profile', description: 'Returns authenticated patient info' })
  @ApiOkResponse({ description: 'Patient profile returned' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getMe(@CurrentPatient() patientId: string, @Req() req: Request) {
    if (!patientId) {
      throw new HttpException('Patient ID missing in token', HttpStatus.BAD_REQUEST);
    }

    const token = this.extractToken(req);

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.usersServiceUrl}/${patientId}`, {
          headers: { 
            Accept: 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
          },
        }),
      );
      return response.data;
    } catch (error) {
      throw new HttpException(
        error.response?.data || 'Failed to retrieve user',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @UseGuards(JwtPatientOrDoctorGuard)
  @ApiOperation({ summary: 'Get all patients (public)' })
  @ApiOkResponse({ description: 'List of all patients' })
  async findAll() {
    try {
      const response = await firstValueFrom(this.httpService.get(`${this.usersServiceUrl}`));
      return response.data;
    } catch (error: any) {
      throw new HttpException(
        error.response?.data || 'Failed to fetch patients',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  /** ========== GET USER BY ID (Admin or self) ========== */
  @Get(':id')
  @UseGuards(JwtPatientOrDoctorGuard)
  async getUserById(@Param('id') id: string, @Req() req: Request) {
    const token = this.extractToken(req);

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.usersServiceUrl}/${id}`, {
          headers: {
            Accept: 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
          },
        }),
      );
      return response.data;
    } catch (error) {
      throw new HttpException(
        error.response?.data || 'Internal Server Error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /** ========== UPDATE USER ========== */
  @Put(':id')
  @UseGuards(JwtPatientGuard)
  async updateUser(@Param('id') id: string, @Body() updateData: any, @Req() req: Request) {
    const token = this.extractToken(req);

    try {
      const response = await firstValueFrom(
        this.httpService.put(`${this.usersServiceUrl}/${id}`, updateData, {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
          },
        }),
      );
      return response.data;
    } catch (error) {
      throw new HttpException(
        error.response?.data || 'Internal Server Error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /** ========== DELETE USER ========== */
  @Delete(':id')
  @UseGuards(JwtPatientGuard)
  async deleteUser(@Param('id') id: string, @Req() req: Request) {
    const token = this.extractToken(req);

    try {
      const response = await firstValueFrom(
        this.httpService.delete(`${this.usersServiceUrl}/${id}`, {
          headers: {
            Accept: 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
          },
        }),
      );
      return response.data;
    } catch (error) {
      throw new HttpException(
        error.response?.data || 'Internal Server Error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}