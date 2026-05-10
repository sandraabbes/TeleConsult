import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Validation globale (DTOs)
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // ✅ CORS (front en local)
  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
  });

  // ❌ pas de prefix global
  // app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 2025);
  console.log(
    `🚀 Availability Microservice is running on http://localhost:${
      process.env.PORT ?? 2025
    }/availability`,
  );
}
bootstrap();
