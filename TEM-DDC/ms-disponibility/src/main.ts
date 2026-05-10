/* eslint-disable prettier/prettier */
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { config } from 'dotenv';

// Load environment variables
config();


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation setup
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: ['http://localhost:3045', 'http://localhost:5173'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: 'Content-Type,Authorization',
  });

  // Swagger configuration
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Medical Availability Service')
    .setDescription(`
      ## Availability Slots Microservice
      
      **Responsibilities**:
      - Manage doctors' available time slots
      - Provide free slots for appointments
      - Update availability after each booking/cancellation
    `)
    .setVersion('1.0')
    .addTag('Availability', 'Time slot management')
    .addTag('Doctors', 'Doctor-specific endpoints')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'Availability API',
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
    },
  });

  const port = process.env.PORT || 3521;
  await app.listen(port);

  console.log(`Availability Service running on port ${port}`);
  console.log(`Swagger documentation available at /api-docs`);
}

bootstrap().catch((err) => {
  console.error('Service startup error:', err);
  process.exit(1);
});