import { NestFactory } from '@nestjs/core';
import { RendezvousModule } from './rendezvous/rendezvous.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as morgan from 'morgan';

async function bootstrap() {
  const app = await NestFactory.create(RendezvousModule);

  const config = app.get(ConfigService);
  const PORT = config.getOrThrow<number>('PORT'); // 🔥 plus de hardcoded port
  // Validation globale
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: config.get('NODE_ENV') === 'production',
    }),
  );
  // CORS propre
  app.enableCors({
    origin: config.get<string>('ALLOWED_ORIGINS')?.split(',') ?? [
      'http://localhost:3045',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(PORT);
  console.log(`🚀 Rendezvous MS running on port ${PORT}`);
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start service:', err);
  process.exit(1);
});
