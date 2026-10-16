import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable() 
export class JwtPatientGuard implements CanActivate {
  private readonly logger = new Logger(JwtPatientGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    // ✅ Read token from header first, then fallback to cookie
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.accessToken;
    
    if (!token) {
      this.logger.error('No token found in headers or cookies.');
      throw new UnauthorizedException('Token missing');
    }

    try {
      this.logger.log(`Verifying token... (Starts with: ${token.substring(0, 15)})`);
      const payload = this.jwtService.verify(token);
      this.logger.log(`Token verified successfully. Payload sub: ${payload.sub}`);
      req.user = payload; // attach payload
      return true;
    } catch (err) {
      this.logger.error(`Token verification failed! Error: ${err.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}