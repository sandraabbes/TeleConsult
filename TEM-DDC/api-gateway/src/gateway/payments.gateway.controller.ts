import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { JwtPatientGuard } from '../common/guards/jwt-patient.guard';
import { JwtDoctorGuard } from '../common/guards/jwt-doctor.guard';
import { JwtPatientOrDoctorGuard } from '../common/guards/jwt-patient-or-doctor.guard';

interface JwtUser {
  sub?: string;
}

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsGatewayController {
  private readonly paymentsClient: ClientProxy;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('PAYMENTS_SERVICE_HOST') || 'localhost';
    const portRaw = this.config.get<string | number>('PAYMENTS_SERVICE_PORT');
    const port =
      typeof portRaw === 'number' ? portRaw : parseInt(String(portRaw || '4007'), 10);

    this.paymentsClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: { host, port },
    });
  }

  @Post(':paymentId/initiate')
  @UseGuards(JwtPatientGuard)
  @ApiOperation({ summary: 'Initiate a Konnect payment' })
  async initiatePayment(@Param('paymentId') paymentId: string) {
    try {
      return await firstValueFrom(
        this.paymentsClient.send('initiate_payment', { paymentId }),
      );
    } catch (e: any) {
      const statusCode = typeof e?.status === 'number' ? e.status : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException(
        e?.message || 'Failed to process payment request',
        statusCode,
      );
    }
  }

  @Get('verify')
  @ApiOperation({ summary: 'Verify a Konnect payment status via callback' })
  async verifyPayment(@Query('paymentRef') paymentRef: string) {
    try {
      return await firstValueFrom(
        this.paymentsClient.send('verify_payment', { paymentRef }),
      );
    } catch (e: any) {
      const statusCode = typeof e?.status === 'number' ? e.status : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException(
        e?.message || 'Failed to process payment request',
        statusCode,
      );
    }
  }

  @Get('rendezvous/:rendezvousId')
  @UseGuards(JwtPatientOrDoctorGuard)
  @ApiOperation({ summary: 'Get payment by rendezvous id' })
  async getPaymentByRendezvous(
    @Param('rendezvousId', ParseIntPipe) rendezvousId: number,
  ) {
    try {
      return await firstValueFrom(
        this.paymentsClient.send('get_payment_by_rendezvous', { rendezvousId }),
      );
    } catch (e: any) {
      const statusCode = typeof e?.status === 'number' ? e.status : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException(
        e?.message || 'Failed to process payment request',
        statusCode,
      );
    }
  }

  @Get('my-payments')
  @UseGuards(JwtPatientGuard)
  @ApiOperation({ summary: 'Get payments for current patient' })
  async getMyPayments(@Req() req: any) {
    try {
      const user = req.user as JwtUser;
      const patientId = user?.sub;
      if (!patientId) {
        throw new HttpException('Invalid user context', HttpStatus.UNAUTHORIZED);
      }
      return await firstValueFrom(
        this.paymentsClient.send('get_payments_by_patient', { patientId }),
      );
    } catch (e: any) {
      const statusCode = typeof e?.status === 'number' ? e.status : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException(
        e?.message || 'Failed to process payment request',
        statusCode,
      );
    }
  }

  @Post(':paymentId/refund')
  @UseGuards(JwtDoctorGuard)
  @ApiOperation({ summary: 'Refund a payment' })
  async refundPayment(@Param('paymentId') paymentId: string) {
    try {
      return await firstValueFrom(
        this.paymentsClient.send('refund_payment', { paymentId }),
      );
    } catch (e: any) {
      const statusCode = typeof e?.status === 'number' ? e.status : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException(
        e?.message || 'Failed to process payment request',
        statusCode,
      );
    }
  }
}

