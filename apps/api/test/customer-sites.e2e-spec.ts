import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { resetDatabase } from './support/database.js';
import { createTestApp, type TestApp } from './support/test-app.js';
import {
  createTestTokenIssuer,
  type TestTokenIssuer,
} from './support/test-tokens.js';

const SITE = {
  name: 'Rahman Villa',
  ownerName: 'Abdul Rahman',
  address: 'Rahman Villa, near Juma Masjid, Edappally, Kochi',
  pin: { latitude: 10.0261, longitude: 76.3086 },
};

describe("A painter's own sites (CUS-005, e2e, real Postgres)", () => {
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
  const path = '/v1/me/sites';

  /** A signed-in person with a Customer App profile of [type]. */
  async function person(
    type: 'PAINTER' | 'CUSTOMER' = 'PAINTER',
    phone = '+919999900001',
  ) {
    const auth = `Bearer ${await issuer.sign({ sub: randomUUID(), phone })}`;
    await request(server())
      .put('/v1/me/customer-profile')
      .set('Authorization', auth)
      .send({ displayName: 'Ravi', customerType: type })
      .expect(200);
    return auth;
  }

  function add(auth: string, body: Record<string, unknown> = SITE) {
    return request(server()).post(path).set('Authorization', auth).send(body);
  }

  it('requires sign-in and is for painters only (D-036)', async () => {
    await request(server()).get(path).expect(401);
    const customer = await person('CUSTOMER');
    const refused = await add(customer).expect(403);
    expect(refused.body.code).toBe('painter_only');
    await request(server())
      .get(path)
      .set('Authorization', customer)
      .expect(403);
  });

  it('adds a site with its pin and lists active sites by name', async () => {
    const auth = await person();
    const created = await add(auth).expect(201);
    expect(created.body).toMatchObject({
      name: 'Rahman Villa',
      ownerName: 'Abdul Rahman',
      pin: { latitude: 10.0261, longitude: 76.3086 },
      archived: false,
    });
    await add(auth, { ...SITE, name: 'Green House', ownerName: '' }).expect(
      201,
    );

    const list = await request(server())
      .get(path)
      .set('Authorization', auth)
      .expect(200);
    expect(
      (list.body.items as { name: string; ownerName: string | null }[]).map(
        (s) => [s.name, s.ownerName],
      ),
    ).toEqual([
      ['Green House', null],
      ['Rahman Villa', 'Abdul Rahman'],
    ]);

    const events = await testApp.prisma.auditEvent.findMany({
      where: { action: 'customer_site.created' },
    });
    expect(events).toHaveLength(2);
    // Never the address or the pin.
    expect(JSON.stringify(events)).not.toContain('Edappally');
  });

  it('requires the map pin, in India (D-049)', async () => {
    const auth = await person();
    const { pin: _pin, ...withoutPin } = SITE;
    const missing = await add(auth, withoutPin).expect(400);
    expect(
      (missing.body.errors as { path: string }[]).map((e) => e.path),
    ).toContain('pin');
    await add(auth, {
      ...SITE,
      pin: { latitude: 51.5, longitude: -0.12 },
    }).expect(400);
    await add(auth, { ...SITE, name: 'x', address: 'abc' }).expect(400);
  });

  it('refuses a second active site with the same name, in any case', async () => {
    const auth = await person();
    await add(auth).expect(201);
    const taken = await add(auth, { ...SITE, name: 'rahman villa' }).expect(
      409,
    );
    expect(taken.body.code).toBe('site_name_taken');
  });

  it('edits, archives and restores; archived sites leave the list', async () => {
    const auth = await person();
    const id = (await add(auth).expect(201)).body.id as string;

    const edited = await request(server())
      .patch(`${path}/${id}`)
      .set('Authorization', auth)
      .send({
        name: 'Rahman Villa 2',
        pin: { latitude: 10.03, longitude: 76.31 },
      })
      .expect(200);
    expect(edited.body).toMatchObject({
      name: 'Rahman Villa 2',
      pin: { latitude: 10.03, longitude: 76.31 },
    });

    await request(server())
      .post(`${path}/${id}/archive`)
      .set('Authorization', auth)
      .expect(200);
    const active = await request(server())
      .get(path)
      .set('Authorization', auth)
      .expect(200);
    expect(active.body.items).toEqual([]);
    const archived = await request(server())
      .get(path)
      .query({ archived: 'true' })
      .set('Authorization', auth)
      .expect(200);
    expect(archived.body.items).toEqual([
      expect.objectContaining({ id, archived: true }),
    ]);

    // Archived sites cannot be changed until restored.
    const locked = await request(server())
      .patch(`${path}/${id}`)
      .set('Authorization', auth)
      .send({ name: 'Other' })
      .expect(409);
    expect(locked.body.code).toBe('site_archived');

    // Restoring next to a new active site with the same name is refused.
    await add(auth, { ...SITE, name: 'Rahman Villa 2' }).expect(201);
    const clash = await request(server())
      .post(`${path}/${id}/restore`)
      .set('Authorization', auth)
      .expect(409);
    expect(clash.body.code).toBe('site_name_taken');

    const actions = (
      await testApp.prisma.auditEvent.findMany({
        where: { entityId: id },
        orderBy: { occurredAt: 'asc' },
      })
    ).map((e) => e.action);
    expect(actions).toEqual([
      'customer_site.created',
      'customer_site.updated',
      'customer_site.archived',
    ]);
  });

  it("keeps each painter's sites private", async () => {
    const ravi = await person('PAINTER', '+919999900001');
    const meera = await person('PAINTER', '+919999900002');
    const id = (await add(ravi).expect(201)).body.id as string;

    const meeraList = await request(server())
      .get(path)
      .set('Authorization', meera)
      .expect(200);
    expect(meeraList.body.items).toEqual([]);
    const calls = [
      () => request(server()).get(`${path}/${id}`),
      () =>
        request(server()).patch(`${path}/${id}`).send({ name: 'Taken over' }),
      () => request(server()).post(`${path}/${id}/archive`),
    ];
    for (const call of calls) {
      await call().set('Authorization', meera).expect(404);
    }
    const still = await request(server())
      .get(`${path}/${id}`)
      .set('Authorization', ravi)
      .expect(200);
    expect(still.body).toMatchObject({ name: 'Rahman Villa', archived: false });
  });

  it('keeps sites when the person switches to Normal Customer and back', async () => {
    const auth = await person();
    await add(auth).expect(201);
    await request(server())
      .put('/v1/me/customer-profile')
      .set('Authorization', auth)
      .send({ displayName: 'Ravi', customerType: 'CUSTOMER' })
      .expect(200);
    await request(server()).get(path).set('Authorization', auth).expect(403);
    await request(server())
      .put('/v1/me/customer-profile')
      .set('Authorization', auth)
      .send({ displayName: 'Ravi', customerType: 'PAINTER' })
      .expect(200);
    const list = await request(server())
      .get(path)
      .set('Authorization', auth)
      .expect(200);
    expect(list.body.items).toHaveLength(1);
  });
});
