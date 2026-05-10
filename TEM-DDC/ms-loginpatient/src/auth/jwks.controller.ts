// patient-auth-microservice/src/jwks.controller.ts
import { Controller, Get } from '@nestjs/common';
import * as fs from 'fs';
import * as jwk from 'pem-jwk';

@Controller('.well-known')
export class JwksController {
  @Get('jwks.json')
  getJwks() {
    console.log('🔑 Patient JWKS endpoint accessed');
    
    const publicKey = fs.readFileSync('./keys/patient-public.pem', 'utf8');
    const jwkKey = jwk.pem2jwk(publicKey);
    
    return {
      keys: [
        {
          ...jwkKey,
          alg: 'RS256',
          use: 'sig',
          kid: 'patient-key-1',  // ✅ MUST be patient-key-1
        },
      ],
    };
  }
}