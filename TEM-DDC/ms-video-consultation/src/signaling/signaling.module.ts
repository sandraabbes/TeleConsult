import { Module, forwardRef } from '@nestjs/common';
import { SignalingGateway } from './signaling.gateway';
import { SignalingService } from './signaling.service';
import { ConsultationModule } from '../consultation/consultation.module';

@Module({
  imports: [forwardRef(() => ConsultationModule)],
  providers: [SignalingGateway, SignalingService],
  exports: [SignalingService],
})
export class SignalingModule {}
