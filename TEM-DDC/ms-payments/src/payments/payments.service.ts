import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  HttpException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { Payment } from '../entities/payment.entity';
import { PaymentStatus } from '../entities/payment-status.enum';
import { CreatePaymentDto } from '../dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly log = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly repo: Repository<Payment>,
    @Inject('NOTIFICATIONS_SERVICE')
    private readonly notificationsClient: ClientProxy,
    @Inject('RENDEZVOUS_SERVICE')
    private readonly rendezvousClient: ClientProxy,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreatePaymentDto): Promise<Payment> {
    let existing = await this.repo.findOne({ where: { rendezvousId: dto.rendezvousId } });
    if (existing) return existing;

    const entity = this.repo.create({
      rendezvousId: dto.rendezvousId,
      patientId: dto.patientId,
      amount: dto.amount,
      status: PaymentStatus.PENDING,
    });

    return this.repo.save(entity);
  }

  async initiatePayment(paymentId: string) {
    const payment = await this.repo.findOne({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Payment already initiated');
    }

    const apiKey = this.configService.get<string>('KONNECT_API_KEY');
    const walletId = this.configService.get<string>('KONNECT_WALLET_ID');
    const baseUrl = this.configService.get<string>('KONNECT_BASE_URL');
    const successUrl = this.configService.get<string>('KONNECT_SUCCESS_URL');
    const failUrl = this.configService.get<string>('KONNECT_FAIL_URL');

    const uniqueOrderId = `${paymentId}-${Date.now()}`;

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${baseUrl}/payments/init-payment`,
          {
            receiverWalletId: walletId,
            token: 'TND',
            amount: payment.amount * 1000,
            type: 'immediate',
            description: `Teleconsultation payment for appointment ${payment.rendezvousId}`,
            orderId: uniqueOrderId,
            successUrl,
            failUrl,
          },
          {
            headers: {
              'x-api-key': apiKey,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const data = response.data;
      payment.konnectPaymentRef = data.paymentRef;
      payment.konnectPayUrl = data.payUrl;
      await this.repo.save(payment);

      return { payUrl: payment.konnectPayUrl, paymentRef: payment.konnectPaymentRef };
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.response?.data || error?.message || 'Unknown error';
      this.log.error('Failed to initiate Konnect payment', errorMsg);
      throw new HttpException(`Failed to initiate payment with Konnect: ${JSON.stringify(errorMsg)}`, 500);
    }
  }

  async verifyPayment(paymentRef: string) {
    const payment = await this.repo.findOne({ where: { konnectPaymentRef: paymentRef } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const apiKey = this.configService.get<string>('KONNECT_API_KEY');
    const baseUrl = this.configService.get<string>('KONNECT_BASE_URL');

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${baseUrl}/payments/${paymentRef}`, {
          headers: {
            'x-api-key': apiKey,
          },
        }),
      );

      const status = response.data.payment.status;

      if (status === 'completed') {
        payment.status = PaymentStatus.PAID;
        payment.paidAt = new Date();
      } else {
        payment.status = PaymentStatus.FAILED;
      }

      const saved = await this.repo.save(payment);

      this.sendNotificationsNonBlocking(saved);
      if (saved.status === PaymentStatus.PAID) {
        this.confirmAppointmentAfterPayment(saved);
      }

      return saved;
    } catch (error: any) {
      this.log.error('Failed to verify Konnect payment', error?.response?.data || error?.message);
      throw new HttpException('Failed to verify payment with Konnect', 500);
    }
  }

  async getPaymentByRendezvous(rendezvousId: number): Promise<Payment> {
    const payment = await this.repo.findOne({ where: { rendezvousId } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  async getPaymentsByPatient(patientId: string): Promise<Payment[]> {
    const payments = await this.repo.find({
      where: { patientId },
      order: { createdAt: 'DESC' },
    });
    return payments;
  }

  async refundPayment(paymentId: string): Promise<Payment> {
    const payment = await this.repo.findOne({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException('Only PAID payments can be refunded');
    }

    payment.status = PaymentStatus.REFUNDED;
    const saved = await this.repo.save(payment);

    this.sendRefundNotification(saved);

    return saved;
  }

  private sendNotificationsNonBlocking(payment: Payment) {
    try {
      if (payment.status === PaymentStatus.PAID) {
        this.notificationsClient
          .emit('create_notification', {
            userId: payment.patientId,
            userType: 'PATIENT',
            type: 'PAYMENT_SUCCESS',
            message:
              'Your payment was successful. Your appointment is confirmed.',
          })
          .subscribe({
            error: (err) =>
              this.log.warn(
                `PAYMENT_SUCCESS notification failed (non-blocking): ${
                  err?.message || err
                }`,
              ),
          });
      } else if (payment.status === PaymentStatus.FAILED) {
        this.notificationsClient
          .emit('create_notification', {
            userId: payment.patientId,
            userType: 'PATIENT',
            type: 'PAYMENT_FAILED',
            message: 'Your payment failed. Please try again.',
          })
          .subscribe({
            error: (err) =>
              this.log.warn(
                `PAYMENT_FAILED notification failed (non-blocking): ${
                  err?.message || err
                }`,
              ),
          });
      }
    } catch (e: any) {
      this.log.warn(
        `Notification send failed (non-blocking): ${e?.message || e}`,
      );
    }
  }

  private confirmAppointmentAfterPayment(payment: Payment) {
    try {
      this.rendezvousClient
        .emit('confirm_appointment_after_payment', {
          rendezvousId: payment.rendezvousId,
        })
        .subscribe({
          error: (err) =>
            this.log.warn(
              `confirm_appointment_after_payment failed (non-blocking): ${
                err?.message || err
              }`,
            ),
        });
    } catch (e: any) {
      this.log.warn(
        `confirm_appointment_after_payment failed (non-blocking): ${
          e?.message || e
        }`,
      );
    }
  }

  private sendRefundNotification(payment: Payment) {
    try {
      this.notificationsClient
        .emit('create_notification', {
          userId: payment.patientId,
          userType: 'PATIENT',
          type: 'PAYMENT_FAILED',
          message: 'Your payment has been refunded.',
        })
        .subscribe({
          error: (err) =>
            this.log.warn(
              `REFUND notification failed (non-blocking): ${
                err?.message || err
              }`,
            ),
        });
    } catch (e: any) {
      this.log.warn(
        `Refund notification failed (non-blocking): ${e?.message || e}`,
      );
    }
  }
}

