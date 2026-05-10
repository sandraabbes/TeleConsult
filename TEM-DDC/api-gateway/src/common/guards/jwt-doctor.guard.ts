import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Request } from 'express';
import { firstValueFrom } from 'rxjs';
import * as jwt from 'jsonwebtoken';

interface JWK {
  kty: string;
  use?: string;
  kid?: string;
  n: string;
  e: string;
  alg: string;
}

interface JWKS {
  keys: JWK[];
}

@Injectable()
export class JwtDoctorGuard implements CanActivate {
  private readonly logger = new Logger(JwtDoctorGuard.name);
  private jwksCache: Map<string, JWK[]> = new Map(); // Cache all keys
  private jwksCacheTime: number = 0;
  private readonly CACHE_TTL = 3600000; // 1 hour

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    // ✅ Extract token from cookie or Authorization header
    const token =
      req.cookies?.accessToken ||
      req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      this.logger.warn('❌ Token missing from request');
      throw new UnauthorizedException('Token missing');
    }

    try {
      // ✅ Get configuration
      const issuer = this.configService.get<string>('DOCTOR_ISS') || 'https://auth.doctor.svc';
      const jwksUri = this.configService.get<string>('DOCTOR_JWKS_URI');

      if (!jwksUri) {
        throw new UnauthorizedException('JWKS URI not configured');
      }

      this.logger.debug(`🔍 Verifying token...`);
      this.logger.debug(`   Issuer: ${issuer}`);
      this.logger.debug(`   JWKS URI: ${jwksUri}`);

      // ✅ Decode token header to get kid (if available)
      const decoded = jwt.decode(token, { complete: true });

      if (!decoded || !decoded.header) {
        throw new UnauthorizedException('Invalid token format');
      }

      const kid = decoded.header.kid;
      this.logger.debug(`   Key ID (kid): ${kid || 'NOT PROVIDED'}`);

      // ✅ Get all public keys from JWKS
      const jwks = await this.getJWKS(jwksUri);

      // ✅ Try to verify with the correct key
      const payload = await this.verifyTokenWithKeys(token, jwks, kid, issuer);

      if (!payload || !payload.sub) {
        this.logger.warn('❌ Invalid token payload - missing sub');
        throw new UnauthorizedException('Invalid token payload');
      }

      this.logger.debug(`✅ Token verified for doctor: ${payload.sub}`);

      // ✅ Attach doctor info to request
      req.user = {
        doctorId: String(payload.sub),
        email: payload.email,
        role: payload.role,
      };

      return true;
    } catch (err) {
      this.logger.error(`❌ Token verification failed: ${err.message}`);

      // Handle specific JWT errors
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token expired');
      }

      if (err.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      }

      if (err.name === 'NotBeforeError') {
        throw new UnauthorizedException('Token not yet valid');
      }

      // Generic error
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Fetch JWKS from endpoint
   */
  private async getJWKS(jwksUri: string): Promise<JWK[]> {
    // Check cache first
    const now = Date.now();
    if (
      this.jwksCache.has(jwksUri) &&
      now - this.jwksCacheTime < this.CACHE_TTL
    ) {
      this.logger.debug('📦 Using cached JWKS');
      return this.jwksCache.get(jwksUri)!;
    }

    // Fetch JWKS
    try {
      this.logger.debug(`📡 Fetching JWKS from: ${jwksUri}`);

      const response = await firstValueFrom(
        this.httpService.get<JWKS>(jwksUri, {
          timeout: 5000,
        })
      );

      const jwks = response.data;

      if (!jwks || !jwks.keys || jwks.keys.length === 0) {
        throw new Error('No keys found in JWKS');
      }

      this.logger.debug(`✅ Found ${jwks.keys.length} key(s) in JWKS`);

      // Update cache
      this.jwksCache.set(jwksUri, jwks.keys);
      this.jwksCacheTime = now;

      return jwks.keys;
    } catch (err) {
      this.logger.error(`Failed to fetch JWKS: ${err.message}`);
      throw new UnauthorizedException('Unable to fetch public keys');
    }
  }

  /**
   * Verify token with available keys
   */
  private async verifyTokenWithKeys(
    token: string,
    jwks: JWK[],
    kid: string | undefined,
    issuer: string,
  ): Promise<any> {
    // If kid is provided, try that key first
    if (kid) {
      const jwk = jwks.find((key) => key.kid === kid);
      if (jwk) {
        try {
          const publicKey = this.jwkToPem(jwk);
          return jwt.verify(token, publicKey, {
            algorithms: ['RS256'],
            issuer: issuer,
            audience: 'gateway',
          });
        } catch (err) {
          this.logger.warn(`Failed to verify with kid ${kid}: ${err.message}`);
        }
      } else {
        this.logger.warn(`Key with kid ${kid} not found in JWKS`);
      }
    }

    // Try all keys (when no kid or kid verification failed)
    this.logger.debug(`Trying all ${jwks.length} available keys...`);

    for (let i = 0; i < jwks.length; i++) {
      const jwk = jwks[i];
      try {
        const publicKey = this.jwkToPem(jwk);
        const payload = jwt.verify(token, publicKey, {
          algorithms: ['RS256'],
          issuer: issuer,
          audience: 'gateway',
        });

        this.logger.debug(
          `✅ Token verified with key ${jwk.kid || `index ${i}`}`
        );
        return payload;
      } catch (err) {
        // Try next key
        this.logger.debug(
          `Key ${jwk.kid || `index ${i}`} failed: ${err.message}`
        );
        continue;
      }
    }

    // None of the keys worked
    throw new Error('Token could not be verified with any available key');
  }

  /**
   * Convert JWK to PEM format
   */
  private jwkToPem(jwk: JWK): string {
    const crypto = require('crypto');

    try {
      // Create RSA public key from JWK
      const key = crypto.createPublicKey({
        key: {
          kty: 'RSA',
          n: jwk.n,
          e: jwk.e,
        },
        format: 'jwk',
      });

      // Export as PEM
      return key.export({ type: 'spki', format: 'pem' }) as string;
    } catch (err) {
      this.logger.error(`Failed to convert JWK to PEM: ${err.message}`);
      throw new Error('Invalid JWK format');
    }
  }
}
