import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Main');
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4010;

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: port,
    },
  });

  const tcpServer = (app as any).server?.server;
  if (tcpServer && typeof tcpServer.setTimeout === 'function') {
    tcpServer.setTimeout(120000);
  }

  await app.listen();
  logger.log(`ms-ai microservice is listening on TCP port ${port}`);
}
bootstrap();
