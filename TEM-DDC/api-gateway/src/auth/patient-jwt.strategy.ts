// api-gateway/src/strategies/patient-jwt.strategy.ts
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { passportJwtSecret } from 'jwks-rsa';

@Injectable()
export class PatientJwtStrategy extends PassportStrategy(Strategy, 'jwt-patient') {
  constructor() {
    const jwksUri = process.env.PATIENT_JWKS_URI || '';
    const issuer = process.env.PATIENT_ISS || '';
    
    console.log('🔧 Initializing PatientJwtStrategy with:');
    console.log('   JWKS URI:', jwksUri);
    console.log('   Issuer:', issuer);
    console.log('   Audience:', 'gateway');
    
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req) => {
          const token = req?.cookies?.accessToken || null;
          console.log('🔍 Patient Token from cookie:', token ? 'Found' : 'Not found');
          return token;
        },
      ]),
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri,
        handleSigningKeyError: (err, cb) => {
          console.error('❌ Patient JWKS Signing Key Error:', err);
          cb(err);
        },
      }),
      algorithms: ['RS256'],
      ignoreExpiration: false,
      issuer,
      audience: 'gateway',
    });
    
    console.log('✅ PatientJwtStrategy initialized successfully');
  }

  async validate(payload: any) {
    console.log('🔍 ========== PATIENT JWT VALIDATION START ==========');
    console.log('🔍 Full Payload:', JSON.stringify(payload, null, 2));
    console.log('🔍 Payload.sub (patient ID):', payload?.sub || payload?.id);
    console.log('🔍 Payload.email:', payload?.email);
    console.log('🔍 Payload.role:', payload?.role);
    console.log('🔍 Payload.iss (issuer):', payload?.iss);
    console.log('🔍 Payload.aud (audience):', payload?.aud);
    
    if (!payload) {
      console.error('❌ Payload is null or undefined');
      throw new UnauthorizedException('Invalid token payload');
    }
    
    if (payload.role !== 'patient') {
      console.error('❌ Invalid role. Expected: patient, Got:', payload?.role);
      throw new UnauthorizedException('Invalid role - must be patient');
    }

    const user = {
      patientId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    
    console.log('✅ Patient validated successfully:', user);
    console.log('🔍 ========== PATIENT JWT VALIDATION END ==========');
    return user;
  }
}