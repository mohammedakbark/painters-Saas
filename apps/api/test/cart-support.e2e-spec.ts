import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { resetDatabase } from './support/database.js';
import { createTestApp, type TestApp } from './support/test-app.js';
import {
  createTestTokenIssuer,
  type TestTokenIssuer,
} from './support/test-tokens.js';

describe('Shades and cart check for the cart (CUS-004, e2e, real Postgres)', () => {
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
   * Live shop "Kochi Paints" sells Tinted Emulsion (shades) 1 L ₹500 and
   * 4 L ₹1,800 (not available), and Primer (no shades). The brand card has
   * BC-200, BC-100 (the shop's favourite) and an inactive BC-999; the shop
   * has its own code OWN-1 and another brand's code OTHER-1.
   */
  async function seed() {
    const p = testApp.prisma;
    const category = await p.catalogueCategory.create({
      data: { name: 'Interior', nameKey: 'interior' },
    });
    const brand = await p.brand.create({
      data: { name: 'Asian Colours', nameKey: 'asian colours' },
    });
    const otherBrand = await p.brand.create({
      data: { name: 'Other Brand', nameKey: 'other brand' },
    });
    const product = (name: string, supportsShades: boolean) =>
      p.catalogueProduct.create({
        data: {
          name,
          nameKey: name.toLowerCase(),
          brandId: brand.id,
          categoryId: category.id,
          supportsShades,
          packs: {
            create: [
              { quantity: 1, unit: 'LITRE' },
              { quantity: 4, unit: 'LITRE' },
            ],
          },
        },
        include: { packs: { orderBy: { quantity: 'asc' } } },
      });
    const tinted = await product('Tinted Emulsion', true);
    const primer = await product('Primer', false);
    const shop = await p.shop.create({
      data: { name: 'Kochi Paints', status: 'ACTIVE' },
    });
    const list = (catalogue: typeof tinted, prices: [number, boolean][]) =>
      p.shopProduct.create({
        data: {
          shopId: shop.id,
          catalogueProductId: catalogue.id,
          packs: {
            create: prices.map(([pricePaise, available], i) => ({
              cataloguePackId: catalogue.packs[i]!.id,
              pricePaise,
              available,
            })),
          },
        },
        include: { packs: true },
      });
    const shopTinted = await list(tinted, [
      [50000, true],
      [180000, false],
    ]);
    const shopPrimer = await list(primer, [[30000, true]]);

    await p.shade.createMany({
      data: [
        { brandId: brand.id, code: 'BC-200', name: 'Sky Blue' },
        {
          brandId: brand.id,
          code: 'BC-100',
          name: 'Sunflower',
          previewHex: '#F2C230',
        },
        { brandId: brand.id, code: 'BC-999', name: 'Retired', active: false },
      ],
    });
    const favourite = await p.shade.findFirstOrThrow({
      where: { code: 'BC-100' },
    });
    await p.shopFavouriteShade.create({
      data: { shopId: shop.id, shadeId: favourite.id },
    });
    await p.shopShade.createMany({
      data: [
        { shopId: shop.id, code: 'OWN-1', name: 'House Cream' },
        {
          shopId: shop.id,
          brandId: otherBrand.id,
          code: 'OTHER-1',
          name: 'Other Brand Grey',
        },
      ],
    });
    return { shop, shopTinted, shopPrimer };
  }

  it("lists the shop's favourites first, then the brand card and own codes", async () => {
    const { shop, shopTinted } = await seed();
    const response = await request(server())
      .get(`/v1/discover/shops/${shop.id}/products/${shopTinted.id}/shades`)
      .set('Authorization', await auth())
      .expect(200);
    expect(response.body.more).toBe(false);
    expect(
      (response.body.items as { code: string; favourite: boolean }[]).map(
        (s) => [s.code, s.favourite],
      ),
    ).toEqual([
      ['BC-100', true],
      ['BC-200', false],
      ['OWN-1', false],
    ]);
    expect(response.body.items[0]).toMatchObject({
      name: 'Sunflower',
      previewHex: '#F2C230',
    });
  });

  it('searches shades by code or name', async () => {
    const { shop, shopTinted } = await seed();
    const response = await request(server())
      .get(`/v1/discover/shops/${shop.id}/products/${shopTinted.id}/shades`)
      .query({ q: 'cream' })
      .set('Authorization', await auth())
      .expect(200);
    expect(response.body.items).toEqual([
      expect.objectContaining({ code: 'OWN-1' }),
    ]);
  });

  it('has no shades for a product without shades', async () => {
    const { shop, shopPrimer } = await seed();
    const response = await request(server())
      .get(`/v1/discover/shops/${shop.id}/products/${shopPrimer.id}/shades`)
      .set('Authorization', await auth())
      .expect(200);
    expect(response.body).toEqual({ items: [], more: false });
  });

  it("returns today's price and availability, leaving out packs no longer sold", async () => {
    const { shop, shopTinted, shopPrimer } = await seed();
    const token = await auth();
    const [one, four] = [...shopTinted.packs].sort(
      (a, b) => a.pricePaise - b.pricePaise,
    );
    await testApp.prisma.shopProductPack.update({
      where: { id: one!.id },
      data: { pricePaise: 52000 },
    });
    await testApp.prisma.shopProduct.update({
      where: { id: shopPrimer.id },
      data: { status: 'ARCHIVED' },
    });
    const response = await request(server())
      .post(`/v1/discover/shops/${shop.id}/cart-check`)
      .set('Authorization', token)
      .send({
        packIds: [one!.id, four!.id, shopPrimer.packs[0]!.id, randomUUID()],
      })
      .expect(200);
    expect(response.body.packs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          packId: one!.id,
          productName: 'Tinted Emulsion',
          label: '1 L',
          pricePaise: 52000,
          available: true,
          supportsShades: true,
        }),
        expect.objectContaining({ packId: four!.id, available: false }),
      ]),
    );
    expect(response.body.packs).toHaveLength(2);
    expect(JSON.stringify(response.body)).not.toContain('mrp');
  });

  it("does not check another shop's packs", async () => {
    const { shopTinted } = await seed();
    const other = await testApp.prisma.shop.create({
      data: { name: 'Other Paints', status: 'ACTIVE' },
    });
    const response = await request(server())
      .post(`/v1/discover/shops/${other.id}/cart-check`)
      .set('Authorization', await auth())
      .send({ packIds: [shopTinted.packs[0]!.id] })
      .expect(200);
    expect(response.body.packs).toEqual([]);
  });

  it('rejects an empty or oversized check', async () => {
    const { shop } = await seed();
    const token = await auth();
    await request(server())
      .post(`/v1/discover/shops/${shop.id}/cart-check`)
      .set('Authorization', token)
      .send({ packIds: [] })
      .expect(400);
    await request(server())
      .post(`/v1/discover/shops/${shop.id}/cart-check`)
      .set('Authorization', token)
      .send({ packIds: Array.from({ length: 51 }, () => randomUUID()) })
      .expect(400);
  });
});
