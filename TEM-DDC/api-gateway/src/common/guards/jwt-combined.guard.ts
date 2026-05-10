import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';

/**
 * Combined JWT Guard that can handle both Patient and Doctor authentication
 * Use with @AllowedRoles decorator to specify which roles are allowed
 */
@Injectable()
export class JwtCombinedGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    
    // Get allowed roles from decorator (if any)
    const allowedRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    // Extract token from cookie or header
    const token = this.extractToken(req);
    if (!token) {
      throw new UnauthorizedException('Authentication token missing');
    }

    try {
      // Verify token
      const payload = this.jwtService.verify(token);
      
      // Check if user has required role (if roles are specified)
      if (allowedRoles && allowedRoles.length > 0) {
        const userRole = payload.role || payload.userType;
        if (!allowedRoles.includes(userRole)) {
          throw new UnauthorizedException(
            `Access denied. Required roles: ${allowedRoles.join(', ')}`
          );
        }
      }
      
      // Attach user to request
      req.user = payload;
      return true;
      
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(req: Request): string | undefined {
    // Check cookie first, then Authorization header
    return req.cookies?.accessToken || 
           req.headers.authorization?.replace('Bearer ', '').trim();
  }
}