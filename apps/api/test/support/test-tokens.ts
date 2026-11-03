import { randomUUID } from 'node:crypto';
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type JWTVerifyGetKey,
  SignJWT,
} from 'jose';

/**
 * Test-only token issuer. Mirrors what Supabase Auth issues (ES256, issuer and
 * `authenticated` audience) so e2e tests never need the real provider.
 */
export interface TestTokenIssuer {
  /** Key set to inject as ACCESS_TOKEN_KEYS. */
  keys: JWTVerifyGetKey;
  sign(claims?: TokenClaims, options?: SignOptions): Promise<string>;
}

export interface TokenClaims {
  sub?: string;
  email?: string;
  phone?: string;
  is_anonymous?: boolean;
}

export interface SignOptions {
  issuer?: string;
  audience?: string;
  /** Seconds from now; negative for an already expired token. */
  expiresIn?: number;
}

const KEY_ID = 'test-es256-key';

export async function createTestTokenIssuer(): Promise<TestTokenIssuer> {
  const { publicKey, privateKey } = await generateKeyPair('ES256', {
    extractable: true,
  });
  const publicJwk = {
    ...(await exportJWK(publicKey)),
    kid: KEY_ID,
    alg: 'ES256',
  };
  const keys = createLocalJWKSet({ keys: [publicJwk] });

  return {
    keys,
    sign: async (claims = {}, options = {}) => {
      const now = Math.floor(Date.now() / 1000);
      return new SignJWT({ role: 'authenticated', ...claims })
        .setProtectedHeader({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' })
        .setSubject(claims.sub ?? randomUUID())
        .setIssuer(options.issuer ?? testIssuer())
        .setAudience(options.audience ?? 'authenticated')
        .setIssuedAt(now - 5)
        .setExpirationTime(now + (options.expiresIn ?? 3600))
        .sign(privateKey);
    },
  };
}

/** A correctly shaped token signed with HS256 (a shared secret). Must be rejected. */
export async function signHs256Token(sub = randomUUID()): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256', kid: KEY_ID, typ: 'JWT' })
    .setSubject(sub)
    .setIssuer(testIssuer())
    .setAudience('authenticated')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(new TextEncoder().encode('a-shared-secret-of-at-least-32-bytes!!'));
}

/** An unsigned token (`alg: none`). Must be rejected. */
export function unsignedToken(sub = randomUUID()): string {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
    sub,
    iss: testIssuer(),
    aud: 'authenticated',
    iat: now,
    exp: now + 3600,
  })}.`;
}

function testIssuer(): string {
  const issuer = process.env.AUTH_ISSUER;
  if (!issuer) {
    throw new Error('AUTH_ISSUER must be set for e2e tests (see .env.test).');
  }
  return issuer;
}
