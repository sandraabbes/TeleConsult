import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { PaymentsModule } from './payments/payments.module';

async function bootstrap() {
  const app = await NestFactory.create(PaymentsModule);
  const config = app.get(ConfigService);

  const port = parseInt(config.get<string>('PORT') || '4007', 10);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port,
    },
  });

  await app.startAllMicroservices();
}

bootstrap();

