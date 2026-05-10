import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      this.logger.warn('❌ Admin token missing');
      throw new UnauthorizedException('Admin token missing');
    }

    try {
      const payload = this.jwtService.verify(token);

      if (payload.role !== 'ADMIN') {
        this.logger.warn(`❌ Invalid role: ${payload.role}`);
        throw new UnauthorizedException('Access denied: Admin role required');
      }

      req.user = payload;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      this.logger.error(`❌ Admin token verification failed: ${err.message}`);
      throw new UnauthorizedException('Invalid or expired admin token');
    }
  }
}
