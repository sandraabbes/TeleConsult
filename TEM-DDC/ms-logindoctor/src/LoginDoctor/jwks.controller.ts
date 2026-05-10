// src/auth/jwks.controller.ts
import { Controller, Get } from '@nestjs/common';
import * as fs from 'fs';
import * as jwk from 'pem-jwk';

@Controller('.well-known')
export class JwksController {
  @Get('jwks.json')
  getJwks() {
    const publicKey = fs.readFileSync('./keys/public.pem', 'utf8');
    const jwkKey = jwk.pem2jwk(publicKey);
    return {
      keys: [
        {
          ...jwkKey,
          alg: 'RS256',
          use: 'sig',
          kid: 'doctor-key-1',
        },
      ],
    };
  }
}
