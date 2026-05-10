import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 1. Header Bearer token
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // 2. Cookie
        (req: Request) => req?.cookies?.accessToken || null,
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'supersecretkey',
    });
  }

  async validate(payload: any) {
    // Payload contains token data: { sub, email, role }
    return {
      id: payload?.sub ?? payload?.id ?? payload?.userId ?? payload?._id ?? null,
      email: payload.email,
      role: payload.role,
    };
  }
}
