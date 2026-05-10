import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Simple HTTP auth guard. In production, validate JWT from Authorization header.
 * For now accepts Bearer token or a mock user header for development.
 */
@Injectable()
export class HttpAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    const mockUserId = request.headers['x-user-id'] as string | undefined;

    if (mockUserId) {
      (request as Request & { user: { sub: string } }).user = { sub: mockUserId };
      return true;
    }

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      // TODO: verify JWT with config.get('JWT_SECRET')
      try {
        (request as Request & { user: { sub: string } }).user = { sub: token };
        return true;
      } catch {
        throw new UnauthorizedException('Invalid token');
      }
    }

    throw new UnauthorizedException('Missing or invalid authorization');
  }
}
