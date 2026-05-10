import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
  HttpCode,
  Logger,
  ParseIntPipe,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AdminGuard } from '../common/guards/admin.guard';
import { AdminService } from '../admin/admin.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Admin')
@Controller()
export class AdminGatewayController {
  private readonly logger = new Logger(AdminGatewayController.name);
  private readonly doctorsBaseUrl: string;
  private readonly notificationsClient: ClientProxy;

  constructor(
    private readonly httpService: HttpService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly adminService: AdminService,
  ) {
    this.doctorsBaseUrl = this.configService.get<string>('REGISTER_DOCTOR_MS') || 'http://localhost:3032/doctors';

    const notiHost = this.configService.get<string>('NOTIFICATIONS_SERVICE_HOST') || 'localhost';
    const notiPortRaw = this.configService.get<string | number>('NOTIFICATIONS_SERVICE_PORT');
    const notiPort = typeof notiPortRaw === 'number' ? notiPortRaw : parseInt(String(notiPortRaw || '4005'), 10);
    this.notificationsClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: { host: notiHost, port: notiPort },
    });
  }

  // ═══════════════════════════════════════════════════
  // AUTH
  // ═══════════════════════════════════════════════════

  /** ADMIN LOGIN */
  @Post('auth/admin/login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Admin login' })
  async adminLogin(@Body() body: { email: string; password: string }) {
    const { email, password } = body;

    if (!email || !password) {
      throw new HttpException('Email and password are required', HttpStatus.BAD_REQUEST);
    }

    const admin = await this.adminService.validateAdmin(email, password);
    if (!admin) {
      throw new HttpException('Invalid email or password', HttpStatus.UNAUTHORIZED);
    }

    const payload = { sub: admin.id, role: 'ADMIN', email: admin.email };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '8h' });

    this.logger.log(`✅ Admin logged in: ${admin.email}`);

    return {
      accessToken,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
    };
  }

  // ═══════════════════════════════════════════════════
  // ADMIN DOCTOR MANAGEMENT (all protected by AdminGuard)
  // ═══════════════════════════════════════════════════

  /** GET PENDING DOCTORS */
  @Get('admin/doctors/pending')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all doctors pending review' })
  async getPendingDoctors() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.doctorsBaseUrl}/admin/pending`),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`❌ Failed to fetch pending doctors: ${error.message}`);
      throw new HttpException(
        error?.response?.data?.message || 'Failed to fetch pending doctors',
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /** GET ALL DOCTORS (with optional status filter) */
  @Get('admin/doctors')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all doctors with optional status filter' })
  async getAllDoctors(@Query('status') status?: string) {
    try {
      const url = status
        ? `${this.doctorsBaseUrl}/admin/all?status=${status}`
        : `${this.doctorsBaseUrl}/admin/all`;
      const response = await firstValueFrom(
        this.httpService.get(url),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`❌ Failed to fetch doctors: ${error.message}`);
      throw new HttpException(
        error?.response?.data?.message || 'Failed to fetch doctors',
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /** GET DOCTOR DOCUMENTS */
  @Get('admin/doctors/:id/docs')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get doctor licence and identity images' })
  async getDoctorDocs(@Param('id', ParseIntPipe) id: number) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.doctorsBaseUrl}/admin/${id}/docs`),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`❌ Failed to fetch doctor docs: ${error.message}`);
      throw new HttpException(
        error?.response?.data?.message || 'Failed to fetch doctor documents',
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /** VERIFY/REJECT A DOCTOR */
  @Patch('admin/doctors/:id/verify')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve or reject a doctor' })
  async verifyDoctor(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { action: 'APPROVE' | 'REJECT'; rejectionReason?: string },
  ) {
    const { action, rejectionReason } = body;

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      throw new HttpException('Action must be APPROVE or REJECT', HttpStatus.BAD_REQUEST);
    }

    if (action === 'REJECT' && !rejectionReason) {
      throw new HttpException('Rejection reason is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const response = await firstValueFrom(
        this.httpService.patch(`${this.doctorsBaseUrl}/admin/${id}/verify`, { action, rejectionReason }),
      );

      // Send notification to the doctor
      try {
        if (action === 'APPROVE') {
          await firstValueFrom(
            this.notificationsClient.send('create_notification', {
              userId: String(id),
              userType: 'DOCTOR',
              type: 'DOCTOR_VERIFIED',
              message: 'Your credentials have been verified. You can now receive patients.',
            }),
          );
        } else {
          await firstValueFrom(
            this.notificationsClient.send('create_notification', {
              userId: String(id),
              userType: 'DOCTOR',
              type: 'DOCTOR_REJECTED',
              message: `Your application was rejected. Reason: ${rejectionReason}`,
            }),
          );
        }
        this.logger.log(`📨 Notification sent to doctor ${id}: ${action}`);
      } catch (notiErr) {
        this.logger.warn(`⚠️ Failed to send notification to doctor ${id}: ${notiErr.message}`);
        // Don't fail the request if notification fails
      }

      return response.data;
    } catch (error) {
      this.logger.error(`❌ Failed to verify doctor: ${error.message}`);
      throw new HttpException(
        error?.response?.data?.message || 'Failed to verify doctor',
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /** SUSPEND A DOCTOR */
  @Patch('admin/doctors/:id/suspend')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Suspend a doctor' })
  async suspendDoctor(@Param('id', ParseIntPipe) id: number) {
    try {
      const response = await firstValueFrom(
        this.httpService.patch(`${this.doctorsBaseUrl}/admin/${id}/suspend`, {}),
      );

      // Send notification
      try {
        await firstValueFrom(
          this.notificationsClient.send('create_notification', {
            userId: String(id),
            userType: 'DOCTOR',
            type: 'DOCTOR_SUSPENDED',
            message: 'Your account has been suspended. Please contact support for more information.',
          }),
        );
        this.logger.log(`📨 Suspension notification sent to doctor ${id}`);
      } catch (notiErr) {
        this.logger.warn(`⚠️ Failed to send suspension notification: ${notiErr.message}`);
      }

      return response.data;
    } catch (error) {
      this.logger.error(`❌ Failed to suspend doctor: ${error.message}`);
      throw new HttpException(
        error?.response?.data?.message || 'Failed to suspend doctor',
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
