import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { resetDatabase } from './support/database.js';
import { createTestApp, type TestApp } from './support/test-app.js';
import {
  createTestTokenIssuer,
  type TestTokenIssuer,
} from './support/test-tokens.js';

describe('Shop storefront (CUS-003, e2e, real Postgres)', () => {
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
  const auth = async () =>
    `Bearer ${await issuer.sign({ sub: randomUUID(), phone: '+919999900001' })}`;

  /**
   * Live shop "Kochi Paints" with:
   * - Emulsion (catalogue, Interior): 1 L ₹500 available, 4 L ₹1,800 not available
   * - Wall Putty (own, Primers): 5 kg ₹640 not available only
   * - Old Enamel (catalogue, archived in the shop)
   * - Hidden Primer (catalogue product made inactive by the platform)
   * - No Packs (own product without packs)
   * A second Live shop "Other Paints" sells Emulsion at ₹450.
   * A draft shop sells Emulsion too.
   */
  async function seed() {
    const p = testApp.prisma;
    const interior = await p.catalogueCategory.create({
      data: { name: 'Interior', nameKey: 'interior' },
    });
    const primers = await p.catalogueCategory.create({
      data: { name: 'Primers', nameKey: 'primers' },
    });
    const brand = await p.brand.create({
      data: { name: 'Asian Colours', nameKey: 'asian colours' },
    });
    const catalogue = async (name: string, active = true) =>
      p.catalogueProduct.create({
        data: {
          name,
          nameKey: name.toLowerCase(),
          brandId: brand.id,
          categoryId: interior.id,
          active,
          description: `${name} description`,
          packs: {
            create: [
              { quantity: 1, unit: 'LITRE' },
              { quantity: 4, unit: 'LITRE' },
            ],
          },
        },
        include: { packs: { orderBy: { quantity: 'asc' } } },
      });
    const emulsion = await catalogue('Emulsion');
    const enamel = await catalogue('Old Enamel');
    const hidden = await catalogue('Hidden Primer', false);

    const shop = async (name: string, status: 'ACTIVE' | 'DRAFT') =>
      p.shop.create({ data: { name, status } });
    const kochi = await shop('Kochi Paints', 'ACTIVE');
    const other = await shop('Other Paints', 'ACTIVE');
    const draft = await shop('Draft Paints', 'DRAFT');

    const list = async (
      shopId: string,
      product: typeof emulsion,
      prices: [number, boolean][],
      status: 'ACTIVE' | 'ARCHIVED' = 'ACTIVE',
    ) =>
      p.shopProduct.create({
        data: {
          shopId,
          catalogueProductId: product.id,
          status,
          packs: {
            create: prices.map(([pricePaise, available], i) => ({
              cataloguePackId: product.packs[i]!.id,
              pricePaise,
              mrpPaise: pricePaise + 10000,
              available,
            })),
          },
        },
      });
    const kochiEmulsion = await list(kochi.id, emulsion, [
      [50000, true],
      [180000, false],
    ]);
    const kochiEnamel = await list(
      kochi.id,
      enamel,
      [[30000, true]],
      'ARCHIVED',
    );
    const kochiHidden = await list(kochi.id, hidden, [[20000, true]]);
    const putty = await p.shopProduct.create({
      data: {
        shopId: kochi.id,
        customName: 'Wall Putty',
        customNameKey: 'wall putty',
        customBrandName: 'Local Brand',
        categoryId: primers.id,
        supportsShades: false,
        packs: {
          create: [
            {
              quantity: 5,
              unit: 'KILOGRAM',
              pricePaise: 64000,
              available: false,
            },
          ],
        },
      },
    });
    await p.shopProduct.create({
      data: {
        shopId: kochi.id,
        customName: 'No Packs',
        customNameKey: 'no packs',
        categoryId: primers.id,
        supportsShades: false,
      },
    });
    await list(other.id, emulsion, [[45000, true]]);
    const draftEmulsion = await list(draft.id, emulsion, [[40000, true]]);
    return {
      kochi,
      other,
      draft,
      interior,
      primers,
      kochiEmulsion,
      kochiEnamel,
      kochiHidden,
      putty,
      draftEmulsion,
    };
  }

  const names = (body: { items: { name: string }[] }) =>
    body.items.map((item) => item.name);

  it('requires sign-in', async () => {
    const { kochi } = await seed();
    await request(server())
      .get(`/v1/discover/shops/${kochi.id}/products`)
      .expect(401);
  });

  it("lists only the shop's visible products by name, with its own prices", async () => {
    const { kochi } = await seed();
    const response = await request(server())
      .get(`/v1/discover/shops/${kochi.id}/products`)
      .set('Authorization', await auth())
      .expect(200);
    expect(names(response.body)).toEqual(['Emulsion', 'Wall Putty']);
    expect(response.body.total).toBe(2);

    const [emulsion, putty] = response.body.items;
    expect(emulsion).toMatchObject({
      brand: 'Asian Colours',
      category: { name: 'Interior' },
      available: true,
      fromPricePaise: 50000,
      packs: [
        { label: '1 L', pricePaise: 50000, available: true },
        { label: '4 L', pricePaise: 180000, available: false },
      ],
    });
    // Unavailable packs are shown but marked (D-029).
    expect(putty).toMatchObject({
      brand: 'Local Brand',
      category: { name: 'Primers' },
      available: false,
      fromPricePaise: 64000,
      packs: [{ label: '5 kg', available: false }],
    });
  });

  it('never returns MRP, status or internal catalogue fields', async () => {
    const { kochi } = await seed();
    const response = await request(server())
      .get(`/v1/discover/shops/${kochi.id}/products`)
      .set('Authorization', await auth())
      .expect(200);
    const text = JSON.stringify(response.body);
    for (const key of [
      'mrpPaise',
      'status',
      'catalogueProductId',
      'cataloguePackId',
      'unlistedCataloguePacks',
      'imageSource',
    ]) {
      expect(text).not.toContain(`"${key}"`);
    }
  });

  it('filters by category and searches by product or brand name', async () => {
    const { kochi, primers } = await seed();
    const token = await auth();
    const byCategory = await request(server())
      .get(`/v1/discover/shops/${kochi.id}/products`)
      .query({ categoryId: primers.id })
      .set('Authorization', token)
      .expect(200);
    expect(names(byCategory.body)).toEqual(['Wall Putty']);

    const byBrand = await request(server())
      .get(`/v1/discover/shops/${kochi.id}/products`)
      .query({ q: 'asian' })
      .set('Authorization', token)
      .expect(200);
    expect(names(byBrand.body)).toEqual(['Emulsion']);

    const paged = await request(server())
      .get(`/v1/discover/shops/${kochi.id}/products`)
      .query({ pageSize: 1, page: 2 })
      .set('Authorization', token)
      .expect(200);
    expect(paged.body).toMatchObject({ total: 2, page: 2, pageSize: 1 });
    expect(names(paged.body)).toEqual(['Wall Putty']);
  });

  it('lists categories that have visible products, with counts', async () => {
    const { kochi } = await seed();
    const response = await request(server())
      .get(`/v1/discover/shops/${kochi.id}/categories`)
      .set('Authorization', await auth())
      .expect(200);
    expect(response.body.items).toEqual([
      expect.objectContaining({ name: 'Interior', productCount: 1 }),
      expect.objectContaining({ name: 'Primers', productCount: 1 }),
    ]);
  });

  it('opens one product; archived, hidden and other shops’ products are 404', async () => {
    const { kochi, other, kochiEmulsion, kochiEnamel, kochiHidden } =
      await seed();
    const token = await auth();
    const one = await request(server())
      .get(`/v1/discover/shops/${kochi.id}/products/${kochiEmulsion.id}`)
      .set('Authorization', token)
      .expect(200);
    expect(one.body).toMatchObject({
      name: 'Emulsion',
      description: 'Emulsion description',
    });

    for (const id of [kochiEnamel.id, kochiHidden.id, 'not-a-uuid']) {
      await request(server())
        .get(`/v1/discover/shops/${kochi.id}/products/${id}`)
        .set('Authorization', token)
        .expect(404);
    }
    // Kochi's product through another shop's storefront.
    await request(server())
      .get(`/v1/discover/shops/${other.id}/products/${kochiEmulsion.id}`)
      .set('Authorization', token)
      .expect(404);
  });

  it('keeps each shop’s prices separate and hides draft shops', async () => {
    const { other, draft, draftEmulsion } = await seed();
    const token = await auth();
    const otherList = await request(server())
      .get(`/v1/discover/shops/${other.id}/products`)
      .set('Authorization', token)
      .expect(200);
    expect(otherList.body.items).toEqual([
      expect.objectContaining({ name: 'Emulsion', fromPricePaise: 45000 }),
    ]);

    for (const path of [
      `/v1/discover/shops/${draft.id}/products`,
      `/v1/discover/shops/${draft.id}/categories`,
      `/v1/discover/shops/${draft.id}/products/${draftEmulsion.id}`,
    ]) {
      await request(server()).get(path).set('Authorization', token).expect(404);
    }
  });
});
