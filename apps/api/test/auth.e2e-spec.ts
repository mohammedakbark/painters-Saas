import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createTestApp, type TestApp } from './support/test-app.js';
import { resetDatabase } from './support/database.js';
import {
  createTestTokenIssuer,
  signHs256Token,
  type TestTokenIssuer,
  unsignedToken,
} from './support/test-tokens.js';

const PROBLEM_JSON = /application\/problem\+json/;

describe('Authentication and GET /v1/me (e2e, real Postgres)', () => {
  let issuer: TestTokenIssuer;
  let testApp: TestApp;

  beforeAll(async () => {
    issuer = await createTestTokenIssuer();
    testApp = await createTestApp({ keys: issuer.keys });
  });

  beforeEach(async () => {
    await resetDatabase(testApp.prisma);
  });

  afterAll(async () => {
    await testApp?.app.close();
  });

  const server = () => testApp.app.getHttpServer();

  describe('rejects requests without a valid access token', () => {
    it('401 authentication_required when the header is missing', async () => {
      const response = await request(server()).get('/v1/me').expect(401);

      expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(response.headers['www-authenticate']).toBe('Bearer');
      expect(response.body).toEqual({
        type: 'about:blank',
        title: 'Unauthorized',
        status: 401,
        detail: 'Authentication is required.',
        code: 'authentication_required',
      });
    });

    it('401 authentication_required for a non-bearer scheme', async () => {
      const response = await request(server())
        .get('/v1/me')
        .set('Authorization', 'Basic dXNlcjpwYXNz')
        .expect(401);

      expect(response.body.code).toBe('authentication_required');
    });

    const invalidTokens: [string, () => Promise<string>][] = [
      ['a malformed token', () => Promise.resolve('not.a.jwt')],
      ['an expired token', () => issuer.sign({}, { expiresIn: -60 })],
      [
        'a token from another issuer',
        () => issuer.sign({}, { issuer: 'https://evil.example/auth/v1' }),
      ],
      [
        'a token for another audience',
        () => issuer.sign({}, { audience: 'anon' }),
      ],
      ['an HS256 (shared-secret) token', () => signHs256Token()],
      ['an unsigned (alg none) token', () => Promise.resolve(unsignedToken())],
      [
        'a token signed by an unknown key',
        async () => (await createTestTokenIssuer()).sign(),
      ],
      ['an anonymous session token', () => issuer.sign({ is_anonymous: true })],
      [
        'a token whose subject is not a UUID',
        () => issuer.sign({ sub: 'user-1' }),
      ],
    ];

    it.each(invalidTokens)('401 invalid_token for %s', async (_name, token) => {
      const response = await request(server())
        .get('/v1/me')
        .set('Authorization', `Bearer ${await token()}`)
        .expect(401);

      expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(response.headers['www-authenticate']).toBe(
        'Bearer error="invalid_token"',
      );
      expect(response.body.code).toBe('invalid_token');
      expect(await testApp.prisma.user.count()).toBe(0);
    });
  });

  it('returns the caller and creates the local user on first use', async () => {
    const sub = randomUUID();
    const token = await issuer.sign({
      sub,
      email: 'Admin@Example.COM',
      phone: '919999900001',
    });

    const response = await request(server())
      .get('/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual({
      id: expect.any(String),
      email: 'admin@example.com',
      phone: '+919999900001',
      displayName: null,
      platformRole: null,
      shopMemberships: [],
    });
    const stored = await testApp.prisma.user.findUniqueOrThrow({
      where: { authSubject: sub },
    });
    expect(stored.id).toBe(response.body.id);
  });

  it('stores empty provider claims as null', async () => {
    const token = await issuer.sign({ email: '', phone: '' });

    const response = await request(server())
      .get('/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toMatchObject({ email: null, phone: null });
  });

  it('creates exactly one user for concurrent first requests', async () => {
    const token = await issuer.sign({ sub: randomUUID() });

    const responses = await Promise.all(
      Array.from({ length: 8 }, () =>
        request(server()).get('/v1/me').set('Authorization', `Bearer ${token}`),
      ),
    );

    expect(responses.map((r) => r.status)).toEqual(Array(8).fill(200));
    expect(new Set(responses.map((r) => r.body.id)).size).toBe(1);
    expect(await testApp.prisma.user.count()).toBe(1);
  });

  it('answers 409 instead of linking a new identity to another user’s email', async () => {
    await testApp.prisma.user.create({
      data: { authSubject: randomUUID(), email: 'owner@example.com' },
    });
    const token = await issuer.sign({ email: 'owner@example.com' });

    const response = await request(server())
      .get('/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(409);

    expect(response.body.code).toBe('identity_conflict');
    expect(await testApp.prisma.user.count()).toBe(1);
  });

  it('reports platformRole for platform admins only', async () => {
    const sub = randomUUID();
    const user = await testApp.prisma.user.create({
      data: { authSubject: sub, email: 'root@example.com' },
    });
    await testApp.prisma.platformAdmin.create({
      data: { userId: user.id, role: 'SUPER_ADMIN' },
    });

    const response = await request(server())
      .get('/v1/me')
      .set('Authorization', `Bearer ${await issuer.sign({ sub })}`)
      .expect(200);

    expect(response.body.platformRole).toBe('SUPER_ADMIN');
  });

  it('answers unknown routes with a 404 problem', async () => {
    const response = await request(server())
      .get('/v1/does-not-exist')
      .set('Authorization', `Bearer ${await issuer.sign()}`)
      .expect(404);

    expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(response.body).toEqual({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      detail: 'The requested resource was not found.',
    });
  });
});

describe('Authentication when the signing keys are unavailable (e2e)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    const unreachable = () => Promise.reject(new TypeError('fetch failed'));
    testApp = await createTestApp({ keys: unreachable });
  });

  afterAll(async () => {
    await testApp?.app.close();
  });

  it('answers 503 auth_unavailable instead of 401', async () => {
    const token = await (await createTestTokenIssuer()).sign();

    const response = await request(testApp.app.getHttpServer())
      .get('/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(503);

    expect(response.body.code).toBe('auth_unavailable');
  });
});
