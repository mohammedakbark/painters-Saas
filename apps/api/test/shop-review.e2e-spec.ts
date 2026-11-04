import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import request from 'supertest';
import { resetDatabase } from './support/database.js';
import { createTestApp, type TestApp } from './support/test-app.js';
import {
  createTestTokenIssuer,
  type TestTokenIssuer,
} from './support/test-tokens.js';

const PROFILE = {
  supportPhone: '9876543210',
  address: {
    line1: 'Door 12/345, MG Road',
    city: 'Kochi',
    district: 'Ernakulam',
    stateCode: 'KL',
    postalCode: '682016',
  },
  location: { latitude: 9.9658, longitude: 76.2898, source: 'MAP_PIN' },
};

describe('Shop review (e2e, real Postgres)', () => {
  let issuer: TestTokenIssuer;
  let testApp: TestApp;
  let admin: string;
  let categoryId: string;

  beforeAll(async () => {
    issuer = await createTestTokenIssuer();
    testApp = await createTestApp({ keys: issuer.keys });
  });

  beforeEach(async () => {
    await resetDatabase(testApp.prisma);
    testApp.storage.reset();
    const sub = randomUUID();
    const user = await testApp.prisma.user.create({
      data: { authSubject: sub, email: 'root@example.com' },
    });
    await testApp.prisma.platformAdmin.create({
      data: { userId: user.id, role: 'SUPER_ADMIN' },
    });
    admin = `Bearer ${await issuer.sign({ sub })}`;
    categoryId = (
      await request(server())
        .post('/v1/platform/catalogue/categories')
        .set('Authorization', admin)
        .send({ name: 'Wall putty' })
        .expect(201)
    ).body.id as string;
  });

  afterAll(async () => {
    await testApp?.app.close();
  });

  const server = () => testApp.app.getHttpServer();

  async function owner(phone: string, name: string) {
    const auth = `Bearer ${await issuer.sign({ sub: randomUUID(), phone })}`;
    const shopId = (
      (
        await request(server())
          .post('/v1/shops')
          .set('Authorization', auth)
          .send({ shopName: name, ownerName: 'Anil Kumar' })
          .expect(201)
      ).body as { id: string }
    ).id;
    return { auth, shopId };
  }
  type Owner = Awaited<ReturnType<typeof owner>>;

  const shopCall = (
    o: Owner,
    method: 'get' | 'post' | 'put' | 'patch',
    path: string,
    shopId = o.shopId,
  ) =>
    request(server())
      [method](`/v1/shops/${shopId}${path}`)
      .set('Authorization', o.auth);

  const platformCall = (method: 'get' | 'post', path: string, auth = admin) =>
    request(server())[method](`/v1/platform${path}`).set('Authorization', auth);

  async function photo(): Promise<Buffer> {
    return sharp({
      create: { width: 800, height: 600, channels: 3, background: '#1f4b7a' },
    })
      .jpeg()
      .toBuffer();
  }

  /** Profile, location, photo and 10 products: a complete checklist. */
  async function completeShop(o: Owner): Promise<string[]> {
    await shopCall(o, 'put', '/profile').send(PROFILE).expect(200);
    await shopCall(o, 'put', '/photo')
      .attach('photo', await photo(), {
        filename: 'shop.jpg',
        contentType: 'image/jpeg',
      })
      .expect(200);
    const ids: string[] = [];
    for (let i = 1; i <= 10; i += 1) {
      ids.push(
        (
          await shopCall(o, 'post', '/catalogue/products')
            .send({
              source: 'own',
              name: `Product ${i}`,
              categoryId,
              packs: [{ quantity: 1, unit: 'KILOGRAM', pricePaise: 12000 }],
            })
            .expect(201)
        ).body.id as string,
      );
    }
    return ids;
  }

  const state = async (o: Owner) =>
    (await shopCall(o, 'get', '/review').expect(200)).body as {
      status: string;
      missing: string[];
      canSubmit: boolean;
      open: { submittedAt: string } | null;
      lastDecision: {
        decision: string;
        reasons: string[];
        note: string | null;
      } | null;
    };

  it('refuses a submission until the checklist is complete', async () => {
    const o = await owner('919999900001', 'Lakshmi Paints');
    expect(await state(o)).toMatchObject({
      status: 'DRAFT',
      missing: ['address', 'location', 'support_phone', 'photo', 'products'],
      canSubmit: false,
      open: null,
      lastDecision: null,
    });
    await shopCall(o, 'put', '/profile').send(PROFILE).expect(200);
    const response = await shopCall(o, 'post', '/review-submission').expect(
      409,
    );
    expect(response.body).toMatchObject({
      code: 'onboarding_incomplete',
      detail: 'Complete these first: shop photo, 10 products.',
    });
  });

  it('locks profile, location and photo while in review, not products', async () => {
    const o = await owner('919999900001', 'Lakshmi Paints');
    const products = await completeShop(o);
    expect(await state(o)).toMatchObject({ missing: [], canSubmit: true });

    const submitted = await shopCall(o, 'post', '/review-submission').expect(
      200,
    );
    expect(submitted.body).toMatchObject({
      status: 'PENDING_REVIEW',
      canSubmit: false,
      open: { submittedAt: expect.any(String) },
    });

    for (const attempt of [
      () => shopCall(o, 'put', '/profile').send(PROFILE),
      () => shopCall(o, 'put', '/location').send(PROFILE.location),
    ]) {
      expect((await attempt().expect(409)).body.code).toBe('shop_in_review');
    }
    const photoAttempt = await shopCall(o, 'put', '/photo')
      .attach('photo', await photo(), {
        filename: 'shop.jpg',
        contentType: 'image/jpeg',
      })
      .expect(409);
    expect(photoAttempt.body.code).toBe('shop_in_review');

    // Products stay editable (D-033).
    await shopCall(o, 'patch', `/catalogue/products/${products[0]}`)
      .send({ name: 'Renamed product' })
      .expect(200);

    const again = await shopCall(o, 'post', '/review-submission').expect(409);
    expect(again.body.code).toBe('review_not_allowed');

    const audit = await testApp.prisma.auditEvent.findFirstOrThrow({
      where: { action: 'shop.review_submitted' },
    });
    expect(audit).toMatchObject({
      shopId: o.shopId,
      metadata: { resubmission: false },
    });
  });

  it('lets the owner withdraw a submission and edit again', async () => {
    const o = await owner('919999900001', 'Lakshmi Paints');
    await completeShop(o);
    await shopCall(o, 'post', '/review-submission').expect(200);

    const withdrawn = await shopCall(
      o,
      'post',
      '/review-submission/withdraw',
    ).expect(200);
    expect(withdrawn.body).toMatchObject({
      status: 'DRAFT',
      open: null,
      canSubmit: true,
    });
    await shopCall(o, 'put', '/profile').send(PROFILE).expect(200);
    const twice = await shopCall(
      o,
      'post',
      '/review-submission/withdraw',
    ).expect(409);
    expect(twice.body.code).toBe('review_not_pending');
    expect(
      (await platformCall('get', '/reviews').expect(200)).body.items,
    ).toEqual([]);
  });

  it('requests changes with reasons, takes a resubmission and approves', async () => {
    const o = await owner('919999900001', 'Lakshmi Paints');
    await completeShop(o);
    await shopCall(o, 'post', '/review-submission').expect(200);

    const queue = await platformCall('get', '/reviews').expect(200);
    expect(queue.body.items).toEqual([
      expect.objectContaining({
        shopId: o.shopId,
        shopName: 'Lakshmi Paints',
        resubmission: false,
      }),
    ]);

    const snapshot = await platformCall(
      'get',
      `/shops/${o.shopId}/review`,
    ).expect(200);
    expect(snapshot.body).toMatchObject({
      shop: { id: o.shopId, status: 'PENDING_REVIEW' },
      profile: { supportPhone: '+919876543210', photo: expect.any(Object) },
      products: { activeCount: 10 },
      open: { resubmission: false },
      history: [],
    });
    expect(snapshot.body.products.items).toHaveLength(10);
    expect(
      await testApp.prisma.auditEvent.count({
        where: { action: 'platform.shop_review_viewed', shopId: o.shopId },
      }),
    ).toBe(1);

    const noNote = await platformCall(
      'post',
      `/shops/${o.shopId}/review/decision`,
    )
      .send({
        decision: 'CHANGES_REQUESTED',
        reasons: ['PHOTO_MISSING_OR_UNCLEAR', 'OTHER'],
      })
      .expect(400);
    expect(noNote.body.errors).toEqual([
      { path: 'note', message: 'Explain the other reason in the note.' },
    ]);

    const changes = await platformCall(
      'post',
      `/shops/${o.shopId}/review/decision`,
    )
      .send({
        decision: 'CHANGES_REQUESTED',
        reasons: ['PHOTO_MISSING_OR_UNCLEAR', 'OTHER'],
        note: '  Add the shop name board to the photo. ',
      })
      .expect(200);
    expect(changes.body).toEqual({
      shopId: o.shopId,
      status: 'CHANGES_REQUESTED',
      decision: 'CHANGES_REQUESTED',
    });
    expect(await state(o)).toMatchObject({
      status: 'CHANGES_REQUESTED',
      canSubmit: true,
      lastDecision: {
        decision: 'CHANGES_REQUESTED',
        reasons: ['PHOTO_MISSING_OR_UNCLEAR', 'OTHER'],
        note: 'Add the shop name board to the photo.',
      },
    });
    const decided = await testApp.prisma.auditEvent.findFirstOrThrow({
      where: { action: 'shop.review_decided' },
    });
    expect(decided.metadata).toEqual({
      decision: 'CHANGES_REQUESTED',
      reasons: ['PHOTO_MISSING_OR_UNCLEAR', 'OTHER'],
      note: true,
    });

    // The owner fixes and resubmits.
    await shopCall(o, 'put', '/photo')
      .attach('photo', await photo(), {
        filename: 'shop.jpg',
        contentType: 'image/jpeg',
      })
      .expect(200);
    await shopCall(o, 'post', '/review-submission').expect(200);
    expect(
      (await platformCall('get', '/reviews').expect(200)).body.items,
    ).toEqual([expect.objectContaining({ resubmission: true })]);

    const approved = await platformCall(
      'post',
      `/shops/${o.shopId}/review/decision`,
    )
      .send({ decision: 'APPROVED' })
      .expect(200);
    expect(approved.body.status).toBe('ACTIVE');

    const second = await platformCall(
      'post',
      `/shops/${o.shopId}/review/decision`,
    )
      .send({ decision: 'APPROVED' })
      .expect(409);
    expect(second.body.code).toBe('review_not_pending');

    // Live: edits are free again and the owner sees the approval.
    await shopCall(o, 'put', '/profile').send(PROFILE).expect(200);
    expect(await state(o)).toMatchObject({
      status: 'ACTIVE',
      canSubmit: false,
      lastDecision: { decision: 'APPROVED', reasons: [], note: null },
    });
    const me = await request(server())
      .get('/v1/me')
      .set('Authorization', o.auth)
      .expect(200);
    expect(JSON.stringify(me.body)).toContain('"shopStatus":"ACTIVE"');
    const history = await platformCall(
      'get',
      `/shops/${o.shopId}/review`,
    ).expect(200);
    expect(
      history.body.history.map((h: { decision: string }) => h.decision),
    ).toEqual(['APPROVED', 'CHANGES_REQUESTED']);
  });

  it('validates decisions and refuses shops that are not waiting', async () => {
    const o = await owner('919999900001', 'Lakshmi Paints');
    const approveWithReasons = await platformCall(
      'post',
      `/shops/${o.shopId}/review/decision`,
    )
      .send({ decision: 'APPROVED', reasons: ['OTHER'], note: 'x' })
      .expect(400);
    expect(approveWithReasons.body.errors).toEqual([
      { path: 'reasons', message: 'An approval has no reasons.' },
    ]);
    const noReasons = await platformCall(
      'post',
      `/shops/${o.shopId}/review/decision`,
    )
      .send({ decision: 'CHANGES_REQUESTED' })
      .expect(400);
    expect(noReasons.body.errors).toEqual([
      { path: 'reasons', message: 'Choose at least one reason.' },
    ]);
    const draft = await platformCall(
      'post',
      `/shops/${o.shopId}/review/decision`,
    )
      .send({ decision: 'APPROVED' })
      .expect(409);
    expect(draft.body.code).toBe('review_not_pending');
    await platformCall('get', `/shops/${randomUUID()}/review`).expect(404);
    await platformCall('get', '/shops/not-a-uuid/review').expect(404);
  });

  it('keeps review routes to the shop owner and platform admins', async () => {
    const a = await owner('919999900001', 'Lakshmi Paints');
    const b = await owner('919999900002', 'Shop B Colours');
    await completeShop(a);

    for (const [method, path] of [
      ['get', '/review'],
      ['post', '/review-submission'],
      ['post', '/review-submission/withdraw'],
    ] as const) {
      const response = await shopCall(b, method, path, a.shopId).expect(404);
      expect(response.body.code).toBe('shop_not_found');
    }
    expect((await state(a)).status).toBe('DRAFT');

    for (const [method, path] of [
      ['get', '/reviews'],
      ['get', `/shops/${a.shopId}/review`],
      ['post', `/shops/${a.shopId}/review/decision`],
    ] as const) {
      await platformCall(method, path, a.auth).expect(403);
      await request(server())[method](`/v1/platform${path}`).expect(401);
    }
  });
});
