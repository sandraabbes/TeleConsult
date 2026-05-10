// doctor-auth-microservice/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as jwk from 'pem-jwk';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: "http://localhost:5173",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  });

  // ✅ Read public key once at startup
  let jwkKey;
  try {
    const publicKey = fs.readFileSync('./keys/public.pem', 'utf8');
    jwkKey = jwk.pem2jwk(publicKey);
    console.log('✅ Doctor public key loaded successfully');
  } catch (error) {
    console.error('❌ Failed to load doctor public key:', error);
    process.exit(1); // Stop app if key cannot be loaded
  }

  // ✅ JWKS endpoint
  const expressApp = app.getHttpAdapter().getInstance() as express.Express;
  expressApp.get('/.well-known/jwks.json', (req: express.Request, res: express.Response) => {
    console.log('🔑 Doctor JWKS endpoint accessed');
    res.json({
      keys: [
        {
          ...jwkKey,
          alg: 'RS256',
          use: 'sig',
          kid: 'doctor-key-1', // must match strategy
        },
      ],
    });
  });

  const port = process.env.PORT ?? 3023;
  await app.listen(port);
  console.log(`🚀 Doctor Auth Microservice running on: http://localhost:${port}`);
  console.log(`🔑 JWKS endpoint: http://localhost:${port}/.well-known/jwks.json`);
}

bootstrap();
