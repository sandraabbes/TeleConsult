import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { passportJwtSecret } from 'jwks-rsa';

@Injectable()
export class DoctorJwtStrategy extends PassportStrategy(Strategy, 'jwt-doctor') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req) => {
          const token = req?.cookies?.accessToken || null;
          console.log('🔍 Token from cookie:', token ? 'Found' : 'Not found');
          return token;
        },
      ]),
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: process.env.DOCTOR_JWKS_URI || '',
      }),
      algorithms: ['RS256'],
      ignoreExpiration: false,
      issuer: process.env.DOCTOR_ISS ,
      audience: 'gateway',
    });
    
    console.log('✅ DoctorJwtStrategy initialized');
    console.log('📍 JWKS URI:', process.env.DOCTOR_JWKS_URI );
    console.log('📍 Issuer:', process.env.DOCTOR_ISS );
  }

  validate(payload: any) {
    console.log('🔐 JWT Payload received:', payload);
    
    if (!payload || payload.role !== 'doctor') {
      console.error('❌ Invalid role in payload:', payload?.role);
      throw new UnauthorizedException('Invalid or missing role');
    }

    const user = {
      doctorId: payload.sub || payload.id,
      email: payload.email,
      role: payload.role,
    };
    
    console.log('✅ User validated:', user);
    return user;
  }
}