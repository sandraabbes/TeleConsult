import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { InitiatePaymentDto } from '../dto/initiate-payment.dto';
import { VerifyPaymentDto } from '../dto/verify-payment.dto';
import { GetPaymentByRendezvousDto } from '../dto/get-payment-by-rendezvous.dto';
import { GetPaymentsByPatientDto } from '../dto/get-payments-by-patient.dto';
import { RefundPaymentDto } from '../dto/refund-payment.dto';

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @MessagePattern('create_payment')
  create(@Payload() dto: CreatePaymentDto) {
    return this.paymentsService.create(dto);
  }

  @MessagePattern('initiate_payment')
  initiatePayment(@Payload() dto: InitiatePaymentDto) {
    return this.paymentsService.initiatePayment(dto.paymentId);
  }

  @MessagePattern('verify_payment')
  verifyPayment(@Payload() dto: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(dto.paymentRef);
  }

  @MessagePattern('get_payment_by_rendezvous')
  getPaymentByRendezvous(@Payload() dto: GetPaymentByRendezvousDto) {
    return this.paymentsService.getPaymentByRendezvous(dto.rendezvousId);
  }

  @MessagePattern('get_payments_by_patient')
  getPaymentsByPatient(@Payload() dto: GetPaymentsByPatientDto) {
    return this.paymentsService.getPaymentsByPatient(dto.patientId);
  }

  @MessagePattern('refund_payment')
  refundPayment(@Payload() dto: RefundPaymentDto) {
    return this.paymentsService.refundPayment(dto.paymentId);
  }
}

