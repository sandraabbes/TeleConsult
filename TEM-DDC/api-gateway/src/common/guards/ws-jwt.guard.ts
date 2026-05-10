// src/common/guards/ws-jwt.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

function parseCookie(header?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) {
      const k = part.slice(0, i).trim();
      const v = part.slice(i + 1).trim();
      if (k) out[k] = decodeURIComponent(v || '');
    }
  }
  return out;
}

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const client: any = ctx.switchToWs().getClient(); // socket
    const handshake = client?.handshake || {};
    const headers = handshake.headers || {};

    console.log('[WS-GUARD] 🔐 New WS connection');
    console.log('[WS-GUARD] headers.cookie =', headers['cookie']);
    console.log('[WS-GUARD] handshake.auth =', handshake.auth);

    const token = this.extractToken(client);
    console.log('[WS-GUARD] Extracted token =', token ? '[OK]' : '[NONE]');

    if (!token) {
      console.error('[WS-GUARD] ❌ No token found, rejecting WS connection');
      throw new WsException('Unauthorized: missing token');
    }

    try {
      const secret   = this.cfg.get<string>('JWT_SECRET');
      const issuer   = this.cfg.get<string>('JWT_ISSUER');
      const audience = this.cfg.get<string>('JWT_AUDIENCE');

      const payload: any = this.jwt.verify(token, {
        secret,
        issuer: issuer || undefined,
        audience: audience || undefined,
        clockTolerance: 10,
      });

      console.log('[WS-GUARD] ✅ JWT verified, payload:', {
        sub: payload.sub,
        id: payload.id,
        userId: payload.userId,
        email: payload.email,
      });

      const userId = payload.sub ?? payload.id ?? payload.userId;
      if (!userId) {
        console.error('[WS-GUARD] ❌ Payload has no usable id');
        throw new WsException('Unauthorized: invalid payload');
      }

      client.data = client.data || {};
      client.data.user = {
        id: userId,
        email: payload.email,
        roles: payload.roles,
      };

      return true;
    } catch (err: any) {
      console.error('[WS-GUARD] ❌ JWT verification failed:', err?.message || err);
      throw new WsException('Unauthorized: invalid token');
    }
  }

  /** 🔑 Extraction du token depuis auth, header ou cookie */
  // ws-jwt.guard.ts
private extractToken(client: any): string | null {
  const h = client?.handshake?.headers || {};

  // 1) handshake.auth.token (PRIORITÉ - envoyé par le frontend)
  const tokenFromAuth = client?.handshake?.auth?.token as string | undefined;
  if (tokenFromAuth?.length) {
    console.log('[WS-GUARD] ✅ Token from handshake.auth.token');
    // Enlever "Bearer " si présent
    return tokenFromAuth.startsWith('Bearer ')
      ? tokenFromAuth.slice(7)
      : tokenFromAuth;
  }

  // 2) Authorization header
  const auth = (h['authorization'] || h['Authorization']) as string | undefined;
  if (auth?.startsWith('Bearer ')) {
    console.log('[WS-GUARD] ✅ Token from Authorization header');
    return auth.slice(7);
  }

  // 3) Cookie (mode polling)
  const rawCookie = h['cookie'] as string | undefined;
  if (rawCookie) {
    console.log('[WS-GUARD] Checking cookies...');
    const cookies = parseCookie(rawCookie);
    
    const candidates = ['accessToken', 'access_token', 'Authorization'];
    
    for (const name of candidates) {
      const val = cookies[name];
      if (typeof val === 'string' && val.length) {
        console.log('[WS-GUARD] ✅ Token from cookie:', name);
        return val;
      }
    }
  }

  console.error('[WS-GUARD] ❌ No token found anywhere');
  return null;
}

}



// import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
// import { WsException } from '@nestjs/websockets';
// import { JwtService } from '@nestjs/jwt';
// import { ConfigService } from '@nestjs/config';

// function parseCookie(header?: string): Record<string,string> {
//   const out: Record<string,string> = {};
//   if (!header) return out;
//   for (const part of header.split(';')) {
//     const i = part.indexOf('=');
//     if (i > 0) {
//       const k = part.slice(0, i).trim();
//       const v = part.slice(i + 1).trim();
//       if (k) out[k] = decodeURIComponent(v || '');
//     }
//   }
//   return out;
// }

// @Injectable()
// export class WsJwtGuard implements CanActivate {
//   constructor(
//     private readonly jwt: JwtService,
//     private readonly cfg: ConfigService,
//   ) {}

//   canActivate(ctx: ExecutionContext): boolean {
//     const client: any = ctx.switchToWs().getClient(); // socket
//     const handshake = client?.handshake || {};
//     const headers = handshake.headers || {};

//     console.log('[WS-GUARD] 🔐 New WS connection');
//     console.log('[WS-GUARD] headers.cookie =', headers['cookie']);
//     console.log('[WS-GUARD] handshake.auth =', handshake.auth);

//     const token = this.extractToken(client);
//     console.log('[WS-GUARD] Extracted token =', token ? '[OK]' : '[NONE]');

//     if (!token) {
//       console.error('[WS-GUARD] ❌ No token found, rejecting WS connection');
//       throw new WsException('Unauthorized: missing token');
//     }

//     try {
//       const secret   = this.cfg.get<string>('JWT_SECRET');
//       const issuer   = this.cfg.get<string>('JWT_ISSUER');
//       const audience = this.cfg.get<string>('JWT_AUDIENCE');

//       const payload = this.jwt.verify(token, {
//         secret,
//         issuer: issuer || undefined,
//         audience: audience || undefined,
//         clockTolerance: 10,
//       });

//       console.log('[WS-GUARD] ✅ JWT verified, payload:', {
//         sub: payload.sub,
//         id: payload.id,
//         userId: payload.userId,
//         email: payload.email,
//       });

//       client.data = client.data || {};
//       client.data.user = {
//         id:  payload.sub ?? payload.id ?? payload.userId,
//         email: payload.email,
//         roles: payload.roles,
//       };

//       if (!client.data.user.id) {
//         console.error('[WS-GUARD] ❌ Payload has no usable id');
//         throw new WsException('Unauthorized: invalid payload');
//       }

//       return true;
//     } catch (err) {
//       console.error('[WS-GUARD] ❌ JWT verification failed:', err?.message || err);
//       throw new WsException('Unauthorized: invalid token');
//     }
//   }

//   // ws-jwt.guard.ts

// private extractToken(client: any): string | null {
//   const h = client?.handshake?.headers || {};

//   // 1) handshake.auth.token (PRIORITÉ - envoyé par le frontend)
//   const tokenFromAuth = client?.handshake?.auth?.token as string | undefined;
//   if (tokenFromAuth?.length) {
//     console.log('[WS-GUARD] ✅ Token from handshake.auth.token');
//     // Enlever "Bearer " si présent
//     return tokenFromAuth.startsWith('Bearer ')
//       ? tokenFromAuth.slice(7)
//       : tokenFromAuth;
//   }

//   // 2) Authorization header
//   const auth = (h['authorization'] || h['Authorization']) as string | undefined;
//   if (auth?.startsWith('Bearer ')) {
//     console.log('[WS-GUARD] ✅ Token from Authorization header');
//     return auth.slice(7);
//   }

//   // 3) Cookie (mode polling)
//   const rawCookie = h['cookie'] as string | undefined;
//   if (rawCookie) {
//     console.log('[WS-GUARD] Checking cookies...');
//     const cookies = parseCookie(rawCookie);
    
//     const candidates = ['accessToken', 'access_token', 'Authorization'];
    
//     for (const name of candidates) {
//       const val = cookies[name];
//       if (typeof val === 'string' && val.length) {
//         console.log('[WS-GUARD] ✅ Token from cookie:', name);
//         return val;
//       }
//     }
//   }

//   console.error('[WS-GUARD] ❌ No token found anywhere');
//   return null;
// }

  // private extractToken(client: any): string | null {
  //   const h = client?.handshake?.headers || {};

  //   // 1) Authorization: Bearer …
  //   const auth = (h['authorization'] || h['Authorization']) as string | undefined;
  //   if (auth?.startsWith('Bearer ')) {
  //     console.log('[WS-GUARD] Found token in Authorization header');
  //     return auth.slice(7);
  //   }

  //   // 2) handshake.auth.token
  //   const tokenFromAuth = client?.handshake?.auth?.token as string | undefined;
  //   if (tokenFromAuth?.length) {
  //     console.log('[WS-GUARD] Found token in handshake.auth.token');
  //     return tokenFromAuth.startsWith('Bearer ')
  //       ? tokenFromAuth.slice(7)
  //       : tokenFromAuth;
  //   }

  //   // 3) Cookie
  //   const rawCookie = h['cookie'] as string | undefined;
  //   console.log('[WS-GUARD] Raw cookie header:', rawCookie);
  //   const cookies = parseCookie(rawCookie);

  //   const primaryCookie =
  //     this.cfg.get('JWT_COOKIE_NAME') ||
  //     this.cfg.get('AUTH_COOKIE_NAME') ||
  //     'access_token';

  //   const candidates = [
  //     primaryCookie,
  //     'access_token',
  //     'accessToken',
  //     'Authorization',
  //   ];

  //   console.log('[WS-GUARD] Cookie candidates:', candidates);
  //   console.log('[WS-GUARD] Parsed cookies keys:', Object.keys(cookies));

  //   for (const name of candidates) {
  //     const val = cookies[name];
  //     if (typeof val === 'string' && val.length) {
  //       console.log('[WS-GUARD] Found token in cookie:', name);
  //       return val;
  //     }
  //   }

  //   return null;
  // }




