import request from 'supertest';
import { createTestApp, type TestApp } from './support/test-app.js';
import { createTestTokenIssuer } from './support/test-tokens.js';

describe('Health endpoints (e2e, real Postgres)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    const issuer = await createTestTokenIssuer();
    testApp = await createTestApp({ keys: issuer.keys });
  });

  afterAll(async () => {
    await testApp?.app.close();
  });

  it('GET /health is public, unversioned and reports that the process is alive', () =>
    request(testApp.app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' }));

  it('GET /health/ready is public and reports that the database is reachable', () =>
    request(testApp.app.getHttpServer())
      .get('/health/ready')
      .expect(200)
      .expect({ status: 'ok', checks: { database: 'up' } }));

  it('health routes are not served under /v1', () =>
    request(testApp.app.getHttpServer()).get('/v1/health').expect(404));
});
