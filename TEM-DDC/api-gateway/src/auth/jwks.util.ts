// src/auth/jwks.util.ts
import * as jwks from 'jwks-rsa';
import { JwtHeader } from 'jsonwebtoken';

/**
 * Crée un provider de clé publique compatible avec passport-jwt
 * en utilisant JWKS (JSON Web Key Set).
 */
export const makeSecretProvider = (jwksUri: string) => {
  const client = jwks({
    jwksUri,
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 10,
  });

  return (
    req: any,
    rawJwtToken: string,
    done: (err: any, signingKey?: string | Buffer) => void,
    header?: JwtHeader,
  ) => {
    if (!header?.kid) {
      return done(new Error('No kid found in token header'));
    }

    client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        return done(err);
      }

      if (!key) {
        return done(new Error('Unable to retrieve signing key'));
      }

      try {
        const signingKey = key.getPublicKey();
        done(null, signingKey);
      } catch (e) {
        done(e as Error);
      }
    });
  };
};