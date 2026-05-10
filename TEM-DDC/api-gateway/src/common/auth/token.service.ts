import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { Request } from 'express';

@Injectable()
export class TokenService {
  private readonly publicKey = (process.env.JWT_PUBLIC_KEY || '').replace(/\\n/g, '\n');
  private readonly secret = process.env.JWT_SECRET || '';
  private readonly cookieName = process.env.JWT_COOKIE_NAME || 'accessToken';

  verify(token?: string): { id?: string; email?: string; roles?: any[] } | null {
    if (!token) return null;
    try {
      const payload: any = this.publicKey
        ? jwt.verify(token, this.publicKey, { algorithms: ['RS256'] })
        : jwt.verify(token, this.secret, { algorithms: ['HS256'] });
      const id = payload?.id ?? payload?.sub ?? payload?.userId;
      return { id, email: payload?.email, roles: payload?.roles ?? payload?.role ?? [] };
    } catch { return null; }
  }

  extractFromHttp(req: Request): string | undefined {
    const h = req.headers?.authorization?.toString();
    if (h?.startsWith('Bearer ')) return h.slice(7);
    const t = (req as any)?.cookies?.[this.cookieName] || (req as any)?.cookies?.['access_token'];
    return t;
  }

  extractFromWs(handshake: { auth?: any; headers?: any }): string | undefined {
    const tokenFromAuth = handshake?.auth?.token as string | undefined;
    const tokenFromBearer = handshake?.headers?.authorization?.toString()?.replace(/^Bearer\s+/i, '');
    const tokenFromCookie = this.parseCookies(handshake?.headers?.cookie)?.[this.cookieName]
      || this.parseCookies(handshake?.headers?.cookie)?.['access_token'];
    return tokenFromAuth || tokenFromBearer || tokenFromCookie;
  }

  private parseCookies(header?: string) {
    const out: Record<string,string> = {};
    if (!header) return out;
    header.split(';').forEach(p => { const i=p.indexOf('='); if(i>-1) out[p.slice(0,i).trim()] = decodeURIComponent(p.slice(i+1).trim()); });
    return out;
  }
}
