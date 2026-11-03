import { randomUUID } from 'node:crypto';
import type { ConfigService } from '@nestjs/config';
import {
  createLocalJWKSet,
  errors,
  exportJWK,
  generateKeyPair,
  type JWTVerifyGetKey,
  SignJWT,
} from 'jose';
import type { Env } from '../config/env.js';
import {
  AccessTokenVerifier,
  InvalidAccessTokenError,
  TokenVerificationUnavailableError,
} from './access-token-verifier.js';

const ISSUER = 'http://127.0.0.1:54321/auth/v1';

const config = {
  get: (key: keyof Env) =>
    ({ AUTH_ISSUER: ISSUER, AUTH_AUDIENCE: 'authenticated' })[
      key as 'AUTH_ISSUER'
    ],
} as unknown as ConfigService<Env, true>;

describe('AccessTokenVerifier', () => {
  let privateKey: CryptoKey;
  let keys: JWTVerifyGetKey;

  beforeAll(async () => {
    const pair = await generateKeyPair('ES256', { extractable: true });
    privateKey = pair.privateKey;
    keys = createLocalJWKSet({
      keys: [{ ...(await exportJWK(pair.publicKey)), kid: 'k1', alg: 'ES256' }],
    });
  });

  const sign = (claims: Record<string, unknown>) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
      .setSubject((claims.sub as string | undefined) ?? randomUUID())
      .setIssuer(ISSUER)
      .setAudience('authenticated')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);

  it('returns the subject with normalised contact claims', async () => {
    const sub = randomUUID();
    const verifier = new AccessTokenVerifier(keys, config);

    await expect(
      verifier.verify(
        await sign({
          sub,
          email: ' Admin@Example.com ',
          phone: '919999900001',
        }),
      ),
    ).resolves.toEqual({
      subject: sub,
      email: 'admin@example.com',
      phone: '+919999900001',
    });
  });

  it.each([
    ['empty', '', null],
    ['already E.164', '+919999900001', '+919999900001'],
    ['not a phone number', 'abc', null],
  ])('normalises a %s phone claim', async (_name, phone, expected) => {
    const verifier = new AccessTokenVerifier(keys, config);

    const identity = await verifier.verify(await sign({ phone }));

    expect(identity.phone).toBe(expected);
  });

  it('rejects a token missing iat', async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
      .setSubject(randomUUID())
      .setIssuer(ISSUER)
      .setAudience('authenticated')
      .setExpirationTime('1h')
      .sign(privateKey);

    await expect(
      new AccessTokenVerifier(keys, config).verify(token),
    ).rejects.toBeInstanceOf(InvalidAccessTokenError);
  });

  it.each([
    ['a network failure', () => new TypeError('fetch failed')],
    ['a JWKS timeout', () => new errors.JWKSTimeout()],
    ['a non-200 JWKS response', () => new errors.JOSEError('Expected 200 OK')],
    ['a malformed JWKS', () => new errors.JWKSInvalid()],
  ])(
    'reports %s as unavailable, not as an invalid token',
    async (_name, make) => {
      const failing: JWTVerifyGetKey = () => Promise.reject(make());
      const verifier = new AccessTokenVerifier(failing, config);

      await expect(verifier.verify(await sign({}))).rejects.toBeInstanceOf(
        TokenVerificationUnavailableError,
      );
    },
  );

  it('reports a missing key id match as an invalid token', async () => {
    const noMatch: JWTVerifyGetKey = () =>
      Promise.reject(new errors.JWKSNoMatchingKey());
    const verifier = new AccessTokenVerifier(noMatch, config);

    await expect(verifier.verify(await sign({}))).rejects.toBeInstanceOf(
      InvalidAccessTokenError,
    );
  });
});
