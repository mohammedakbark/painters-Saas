import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { resetDatabase } from './support/database.js';
import { createTestApp, type TestApp } from './support/test-app.js';
import {
  createTestTokenIssuer,
  type TestTokenIssuer,
} from './support/test-tokens.js';

describe('Customer App profile GET/PUT /v1/me/customer-profile (CUS-001, e2e, real Postgres)', () => {
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
  const path = '/v1/me/customer-profile';

  async function bearer(phone: string | null = '+919999900001') {
    const claims = phone === null ? { email: 'a@example.com' } : { phone };
    return `Bearer ${await issuer.sign({ sub: randomUUID(), ...claims })}`;
  }

  it('requires authentication', async () => {
    await request(server()).get(path).expect(401);
    await request(server())
      .put(path)
      .send({ displayName: 'Ravi', customerType: 'PAINTER' })
      .expect(401);
  });

  it('starts incomplete for a new account', async () => {
    const response = await request(server())
      .get(path)
      .set('Authorization', await bearer())
      .expect(200);
    expect(response.body).toEqual({
      displayName: null,
      phone: '+919999900001',
      customerType: null,
      complete: false,
    });
  });

  it('saves the name and type, trims the name and writes one audit event', async () => {
    const auth = await bearer();
    const saved = await request(server())
      .put(path)
      .set('Authorization', auth)
      .send({ displayName: '  Ravi Kumar ', customerType: 'PAINTER' })
      .expect(200);
    expect(saved.body).toEqual({
      displayName: 'Ravi Kumar',
      phone: '+919999900001',
      customerType: 'PAINTER',
      complete: true,
    });
    const read = await request(server())
      .get(path)
      .set('Authorization', auth)
      .expect(200);
    expect(read.body).toEqual(saved.body);

    const events = await testApp.prisma.auditEvent.findMany({
      where: { action: 'user.customer_profile_updated' },
    });
    expect(events).toHaveLength(1);
    expect(events[0]?.metadata).toEqual({
      fields: ['displayName', 'customerType'],
      customerType: 'PAINTER',
    });
    // The name is never put in the audit trail.
    expect(JSON.stringify(events[0]?.metadata)).not.toContain('Ravi');
  });

  it('lets the person change the type later (D-036) and audits only real changes', async () => {
    const auth = await bearer();
    const body = { displayName: 'Ravi', customerType: 'PAINTER' };
    await request(server()).put(path).set('Authorization', auth).send(body);
    await request(server()).put(path).set('Authorization', auth).send(body);
    const changed = await request(server())
      .put(path)
      .set('Authorization', auth)
      .send({ ...body, customerType: 'CUSTOMER' })
      .expect(200);
    expect(changed.body.customerType).toBe('CUSTOMER');
    const events = await testApp.prisma.auditEvent.findMany({
      where: { action: 'user.customer_profile_updated' },
      orderBy: { occurredAt: 'asc' },
    });
    expect(events.map((e) => e.metadata)).toEqual([
      { fields: ['displayName', 'customerType'], customerType: 'PAINTER' },
      { fields: ['customerType'], customerType: 'CUSTOMER' },
    ]);
  });

  it('rejects an empty name and an unknown type with field messages', async () => {
    const response = await request(server())
      .put(path)
      .set('Authorization', await bearer())
      .send({ displayName: '   ', customerType: 'CONTRACTOR' })
      .expect(400);
    const paths = (response.body.errors as { path: string }[]).map(
      (e) => e.path,
    );
    expect(paths).toEqual(
      expect.arrayContaining(['displayName', 'customerType']),
    );
  });

  it('needs a mobile number sign-in to save', async () => {
    const response = await request(server())
      .put(path)
      .set('Authorization', await bearer(null))
      .send({ displayName: 'Ravi', customerType: 'CUSTOMER' })
      .expect(403);
    expect(response.body.code).toBe('phone_verification_required');
  });

  it("only ever touches the caller's own profile", async () => {
    const ravi = await bearer('+919999900001');
    const meera = await bearer('+919999900002');
    await request(server())
      .put(path)
      .set('Authorization', ravi)
      .send({ displayName: 'Ravi', customerType: 'PAINTER' })
      .expect(200);
    // A user id in the body is not part of the contract and changes nothing.
    await request(server())
      .put(path)
      .set('Authorization', meera)
      .send({ displayName: 'Meera', customerType: 'CUSTOMER', userId: 'x' })
      .expect(200);
    const raviNow = await request(server())
      .get(path)
      .set('Authorization', ravi)
      .expect(200);
    expect(raviNow.body).toMatchObject({
      displayName: 'Ravi',
      customerType: 'PAINTER',
    });
  });

  it('does not connect records a shop made for this number (D-054)', async () => {
    const shop = await testApp.prisma.shop.create({ data: { name: 'ABC' } });
    const recorded = await testApp.prisma.shopCustomer.create({
      data: {
        shopId: shop.id,
        name: 'Anu (as the shop knows her)',
        phone: '+919999900003',
        kind: 'PAINTER',
      },
    });
    const auth = await bearer('+919999900003');
    await request(server())
      .put(path)
      .set('Authorization', auth)
      .send({ displayName: 'Anu', customerType: 'CUSTOMER' })
      .expect(200);
    const after = await testApp.prisma.shopCustomer.findUniqueOrThrow({
      where: { id: recorded.id },
    });
    expect(after.userId).toBeNull();
    expect(after.name).toBe('Anu (as the shop knows her)');
  });
});
