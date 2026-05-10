import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import * as cookieParser from 'cookie-parser';
import { join } from 'path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ✅ CORS global (multi-origines, avec cookies)
app.enableCors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://localhost:5173',
    'https://front.mediwave.tn',
    'https://medilink.local'
  ],
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Forwarded-For',
    'User-Agent',
    'Accept',
    'Origin',
    'Cookie'
  ],

  exposedHeaders: ['Set-Cookie'],
});


app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});


    // ⚠️ ADD THIS FIRST
    app.use((req, res, next) => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📨 ${req.method} ${req.url}`);
      console.log(`Content-Type: ${req.headers['content-type']}`);
      console.log(`Content-Length: ${req.headers['content-length']}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      next();
    });

  // ✅ Middleware cookie
  app.use(cookieParser());

app.useGlobalPipes(
  new ValidationPipe({
    whitelist: false,
    forbidNonWhitelisted: false,
    transform: true,
  }),
);


  // ✅ IMPORTANT : Servir les fichiers statiques du dossier storage
  const storagePath = join(__dirname, '..', 'storage');
  app.use('/storage', express.static(storagePath));

  console.log(`[Main] 📁 Serving static files from: ${storagePath}`);
  console.log(`[Main] 📁 Static files available at: http://localhost:3045/storage/`);

  // 📖 Swagger config
  const config = new DocumentBuilder()
    .setTitle('API Gateway - Medilink')
    .setDescription('Passerelle entre les microservices')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // 📁 Fichiers statiques (uploads)
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }))
  app.setGlobalPrefix('api');

  await app.listen(3045, '0.0.0.0');
  console.log('🚀 API Gateway is running on http://localhost:3045/api');
  console.log('📚 Swagger docs: http://localhost:3045/api');
}

bootstrap();
