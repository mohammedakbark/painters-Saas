import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import request from 'supertest';
import { resetDatabase } from './support/database.js';
import { createTestApp, type TestApp } from './support/test-app.js';
import {
  createTestTokenIssuer,
  type TestTokenIssuer,
} from './support/test-tokens.js';

interface Pack {
  id: string;
  cataloguePackId: string | null;
  label: string;
  mrpPaise: number | null;
  pricePaise: number;
  available: boolean;
}
interface ShopProduct {
  id: string;
  source: 'catalogue' | 'own';
  name: string;
  status: string;
  packs: Pack[];
  unlistedCataloguePacks: { id: string; label: string }[];
}

describe('Shop catalogue (e2e, real Postgres)', () => {
  let issuer: TestTokenIssuer;
  let testApp: TestApp;
  let admin: string;
  let categoryId: string;
  let brandId: string;
  let catalogueProduct: { id: string; packs: { id: string; label: string }[] };

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
      await platform('post', '/categories', { name: 'Interior emulsion' })
    ).body.id as string;
    brandId = (await platform('post', '/brands', { name: 'Sample Paints' }))
      .body.id as string;
    catalogueProduct = (
      await platform('post', `/brands/${brandId}/products`, {
        name: 'Silk Emulsion',
        categoryId,
        supportsShades: true,
        packs: [
          { quantity: 1, unit: 'LITRE' },
          { quantity: 4, unit: 'LITRE' },
          { quantity: 20, unit: 'LITRE' },
        ],
      })
    ).body as typeof catalogueProduct;
  });

  afterAll(async () => {
    await testApp?.app.close();
  });

  const server = () => testApp.app.getHttpServer();

  function platform(method: 'post' | 'patch', path: string, body: object) {
    return request(server())
      [method](`/v1/platform/catalogue${path}`)
      .set('Authorization', admin)
      .send(body)
      .expect((response) => {
        if (response.status >= 300) {
          throw new Error(`${path}: ${response.status}`);
        }
      });
  }

  async function shopOwner(phone: string, name: string) {
    const auth = `Bearer ${await issuer.sign({ sub: randomUUID(), phone })}`;
    const response = await request(server())
      .post('/v1/shops')
      .set('Authorization', auth)
      .send({ shopName: name, ownerName: 'Anil Kumar' })
      .expect(201);
    return { auth, shopId: (response.body as { id: string }).id };
  }

  type Owner = Awaited<ReturnType<typeof shopOwner>>;
  const call = (
    owner: Owner,
    method: 'get' | 'post' | 'patch' | 'put' | 'delete',
    path: string,
    body?: object,
    shopId = owner.shopId,
  ) => {
    const req = request(server())
      [method](`/v1/shops/${shopId}/catalogue${path}`)
      .set('Authorization', owner.auth);
    return body ? req.send(body) : req;
  };

  const listCatalogueProduct = (owner: Owner, packIds?: string[]) =>
    call(owner, 'post', '/products', {
      source: 'catalogue',
      catalogueProductId: catalogueProduct.id,
      packs: (
        packIds ?? catalogueProduct.packs.slice(0, 2).map((p) => p.id)
      ).map((cataloguePackId, index) => ({
        cataloguePackId,
        mrpPaise: 50000 + index * 100000,
        pricePaise: 45000 + index * 100000,
      })),
    });

  const ownProduct = (owner: Owner, name: string, extra: object = {}) =>
    call(owner, 'post', '/products', {
      source: 'own',
      name,
      categoryId,
      brandName: 'Local Brand',
      packs: [{ quantity: 1, unit: 'KILOGRAM', pricePaise: 12000 }],
      ...extra,
    });

  describe('products from the brand catalogue', () => {
    it('lists chosen pack sizes with prices and audits the addition', async () => {
      const owner = await shopOwner('919999900001', 'Lakshmi Paints');
      const response = await listCatalogueProduct(owner).expect(201);
      const product = response.body as ShopProduct;

      expect(product).toMatchObject({
        source: 'catalogue',
        name: 'Silk Emulsion',
        brand: { id: brandId, name: 'Sample Paints' },
        category: { id: categoryId, name: 'Interior emulsion' },
        supportsShades: true,
        status: 'ACTIVE',
        catalogueActive: true,
        image: null,
      });
      expect(
        product.packs.map((p) => [p.label, p.mrpPaise, p.pricePaise]),
      ).toEqual([
        ['1 L', 50000, 45000],
        ['4 L', 150000, 145000],
      ]);
      expect(product.packs.every((p) => p.available)).toBe(true);
      expect(product.unlistedCataloguePacks.map((p) => p.label)).toEqual([
        '20 L',
      ]);

      const audit = await testApp.prisma.auditEvent.findFirstOrThrow({
        where: { action: 'shop_catalogue.product_added' },
      });
      expect(audit).toMatchObject({
        shopId: owner.shopId,
        entityId: product.id,
        metadata: { source: 'catalogue', packs: 2 },
      });

      const again = await listCatalogueProduct(owner).expect(409);
      expect(again.body.code).toBe('product_already_listed');
    });

    it('refuses prices above the MRP, foreign packs and archived products', async () => {
      const owner = await shopOwner('919999900001', 'Lakshmi Paints');
      const above = await call(owner, 'post', '/products', {
        source: 'catalogue',
        catalogueProductId: catalogueProduct.id,
        packs: [
          {
            cataloguePackId: catalogueProduct.packs[0].id,
            mrpPaise: 1000,
            pricePaise: 1001,
          },
        ],
      }).expect(400);
      expect(above.body.errors).toEqual([
        {
          path: 'packs.0.pricePaise',
          message: 'The price cannot be more than the MRP.',
        },
      ]);

      const other = (
        await platform('post', `/brands/${brandId}/products`, {
          name: 'Gloss Enamel',
          categoryId,
          packs: [{ quantity: 1, unit: 'LITRE' }],
        })
      ).body as typeof catalogueProduct;
      const foreign = await listCatalogueProduct(owner, [
        other.packs[0].id,
      ]).expect(400);
      expect(foreign.body.code).toBe('pack_not_in_product');

      await platform('patch', `/products/${catalogueProduct.id}`, {
        active: false,
      });
      const archived = await listCatalogueProduct(owner).expect(400);
      expect(archived.body.code).toBe('catalogue_product_unavailable');
    });

    it('keeps the catalogue name read-only and shows when the platform archived it', async () => {
      const owner = await shopOwner('919999900001', 'Lakshmi Paints');
      const product = (await listCatalogueProduct(owner).expect(201))
        .body as ShopProduct;

      const rename = await call(owner, 'patch', `/products/${product.id}`, {
        name: 'My Silk',
      }).expect(400);
      expect(rename.body.code).toBe('catalogue_listing_read_only');

      await platform('patch', `/products/${catalogueProduct.id}`, {
        active: false,
      });
      const view = await call(owner, 'get', `/products/${product.id}`).expect(
        200,
      );
      expect(view.body.catalogueActive).toBe(false);
    });

    it('marks brand products the shop already sells', async () => {
      const owner = await shopOwner('919999900001', 'Lakshmi Paints');
      const product = (await listCatalogueProduct(owner).expect(201))
        .body as ShopProduct;
      const browse = await call(
        owner,
        'get',
        `/brand-products?brandId=${brandId}`,
      ).expect(200);
      expect(browse.body.items).toEqual([
        expect.objectContaining({
          product: expect.objectContaining({ id: catalogueProduct.id }),
          listedProductId: product.id,
        }),
      ]);
    });

    it('stops the platform from removing a pack size a shop sells', async () => {
      const owner = await shopOwner('919999900001', 'Lakshmi Paints');
      await listCatalogueProduct(owner).expect(201);
      const response = await request(server())
        .patch(`/v1/platform/catalogue/products/${catalogueProduct.id}`)
        .set('Authorization', admin)
        .send({ packs: [{ quantity: 4, unit: 'LITRE' }] })
        .expect(409);
      expect(response.body.code).toBe('pack_in_use');

      // The unlisted 20 L can still be removed.
      await platform('patch', `/products/${catalogueProduct.id}`, {
        packs: [
          { quantity: 1, unit: 'LITRE' },
          { quantity: 4, unit: 'LITRE' },
        ],
      });
    });
  });

  describe('own products', () => {
    it('creates own products with case-insensitive unique names', async () => {
      const owner = await shopOwner('919999900001', 'Lakshmi Paints');
      const created = await ownProduct(owner, '  Wall   Putty ', {
        description: '  White cement based. ',
        packs: [
          { quantity: 1, unit: 'KILOGRAM', pricePaise: 12000, mrpPaise: 15000 },
          {
            quantity: 20,
            unit: 'KILOGRAM',
            pricePaise: 90000,
            available: false,
          },
        ],
      }).expect(201);
      expect(created.body).toMatchObject({
        source: 'own',
        catalogueProductId: null,
        name: 'Wall Putty',
        brand: { id: null, name: 'Local Brand' },
        description: 'White cement based.',
        supportsShades: false,
        catalogueActive: true,
      });
      expect(
        (created.body as ShopProduct).packs.map((p) => [p.label, p.available]),
      ).toEqual([
        ['1 kg', true],
        ['20 kg', false],
      ]);

      const duplicate = await ownProduct(owner, 'wall putty').expect(409);
      expect(duplicate.body.code).toBe('own_product_exists');

      // Another shop may use the same name.
      const other = await shopOwner('919999900002', 'Shop B Colours');
      await ownProduct(other, 'Wall Putty').expect(201);
    });

    it('validates brand and category choices', async () => {
      const owner = await shopOwner('919999900001', 'Lakshmi Paints');
      const both = await ownProduct(owner, 'Primer', { brandId }).expect(400);
      expect(both.body.errors).toEqual([
        expect.objectContaining({ path: 'brandName' }),
      ]);

      await platform('patch', `/categories/${categoryId}`, { active: false });
      const archived = await ownProduct(owner, 'Primer').expect(400);
      expect(archived.body.code).toBe('category_unavailable');
    });

    it('renames, rebrands, archives and restores', async () => {
      const owner = await shopOwner('919999900001', 'Lakshmi Paints');
      const id = (
        (await ownProduct(owner, 'Primer').expect(201)).body as ShopProduct
      ).id;

      const updated = await call(owner, 'patch', `/products/${id}`, {
        name: 'Wall Primer',
        brandId,
      }).expect(200);
      expect(updated.body).toMatchObject({
        name: 'Wall Primer',
        brand: { id: brandId, name: 'Sample Paints' },
      });

      await call(owner, 'patch', `/products/${id}`, {
        status: 'ARCHIVED',
      }).expect(200);
      expect(
        (await call(owner, 'get', '/products').expect(200)).body.items,
      ).toEqual([]);
      const archived = await call(
        owner,
        'get',
        '/products?status=ARCHIVED',
      ).expect(200);
      expect(archived.body.items.map((p: ShopProduct) => p.id)).toEqual([id]);

      const audit = await testApp.prisma.auditEvent.findFirstOrThrow({
        where: { action: 'shop_catalogue.product_updated' },
        orderBy: { occurredAt: 'asc' },
      });
      expect(audit.metadata).toEqual({ fields: ['name', 'brandId'] });
    });

    it('lists newest first with a cursor and searches names and brands', async () => {
      const owner = await shopOwner('919999900001', 'Lakshmi Paints');
      for (const name of ['Alpha', 'Beta', 'Gamma']) {
        await ownProduct(owner, name).expect(201);
      }
      await listCatalogueProduct(owner).expect(201);

      const first = await call(owner, 'get', '/products?limit=2').expect(200);
      expect(first.body.items.map((p: ShopProduct) => p.name)).toEqual([
        'Silk Emulsion',
        'Gamma',
      ]);
      const second = await call(
        owner,
        'get',
        `/products?limit=2&cursor=${first.body.nextCursor}`,
      ).expect(200);
      expect(second.body.items.map((p: ShopProduct) => p.name)).toEqual([
        'Beta',
        'Alpha',
      ]);
      expect(second.body.nextCursor).toBeNull();

      const byBrand = await call(owner, 'get', '/products?q=sample').expect(
        200,
      );
      expect(byBrand.body.items.map((p: ShopProduct) => p.name)).toEqual([
        'Silk Emulsion',
      ]);
      const byName = await call(owner, 'get', '/products?q=ET').expect(200);
      expect(byName.body.items.map((p: ShopProduct) => p.name)).toEqual([
        'Beta',
      ]);
    });

    it('stores a product photo under the shop prefix', async () => {
      const owner = await shopOwner('919999900001', 'Lakshmi Paints');
      const id = (
        (await ownProduct(owner, 'Primer').expect(201)).body as ShopProduct
      ).id;
      const png = await sharp({
        create: { width: 600, height: 600, channels: 3, background: '#cccccc' },
      })
        .png()
        .toBuffer();
      const response = await request(server())
        .put(`/v1/shops/${owner.shopId}/catalogue/products/${id}/image`)
        .set('Authorization', owner.auth)
        .attach('image', png, { filename: 'p.png', contentType: 'image/png' })
        .expect(200);
      expect(response.body.imageSource).toBe('shop');
      expect(response.body.image.url).toMatch(
        new RegExp(
          `/shops/${owner.shopId}/products/${id}/image/[0-9a-f-]{36}-1600\\.webp$`,
        ),
      );
    });
  });

  describe('pack sizes', () => {
    it('adds, prices, toggles and removes pack sizes', async () => {
      const owner = await shopOwner('919999900001', 'Lakshmi Paints');
      const product = (await listCatalogueProduct(owner).expect(201))
        .body as ShopProduct;
      const path = `/products/${product.id}/packs`;

      const added = await call(owner, 'post', path, {
        cataloguePackId: product.unlistedCataloguePacks[0].id,
        pricePaise: 600000,
      }).expect(201);
      expect((added.body as ShopProduct).packs.map((p) => p.label)).toEqual([
        '1 L',
        '4 L',
        '20 L',
      ]);
      expect(added.body.unlistedCataloguePacks).toEqual([]);

      const duplicate = await call(owner, 'post', path, {
        cataloguePackId: product.unlistedCataloguePacks[0].id,
        pricePaise: 600000,
      }).expect(409);
      expect(duplicate.body.code).toBe('pack_exists');

      const wrongKind = await call(owner, 'post', path, {
        quantity: 2,
        unit: 'LITRE',
        pricePaise: 1000,
      }).expect(400);
      expect(wrongKind.body.code).toBe('pack_kind_mismatch');

      const oneLitre = product.packs[0];
      const above = await call(owner, 'patch', `${path}/${oneLitre.id}`, {
        pricePaise: 60000,
      }).expect(400);
      expect(above.body.code).toBe('price_above_mrp');

      const toggled = await call(owner, 'patch', `${path}/${oneLitre.id}`, {
        available: false,
        mrpPaise: null,
        pricePaise: 60000,
      }).expect(200);
      expect(
        (toggled.body as ShopProduct).packs.find((p) => p.id === oneLitre.id),
      ).toMatchObject({ available: false, mrpPaise: null, pricePaise: 60000 });

      // The audit names only changed fields; an unchanged save writes nothing.
      const packAudits = () =>
        testApp.prisma.auditEvent.findMany({
          where: { action: 'shop_catalogue.pack_updated' },
          select: { metadata: true },
        });
      expect(await packAudits()).toEqual([
        { metadata: { fields: ['mrpPaise', 'pricePaise', 'available'] } },
      ]);
      await call(owner, 'patch', `${path}/${oneLitre.id}`, {
        available: false,
        mrpPaise: null,
        pricePaise: 60000,
      }).expect(200);
      expect(await packAudits()).toHaveLength(1);

      const removed = await call(
        owner,
        'delete',
        `${path}/${oneLitre.id}`,
      ).expect(200);
      expect((removed.body as ShopProduct).packs.map((p) => p.label)).toEqual([
        '4 L',
        '20 L',
      ]);
    });

    it('keeps at least one pack size', async () => {
      const owner = await shopOwner('919999900001', 'Lakshmi Paints');
      const product = (await ownProduct(owner, 'Primer').expect(201))
        .body as ShopProduct;
      const last = await call(
        owner,
        'delete',
        `/products/${product.id}/packs/${product.packs[0].id}`,
      ).expect(409);
      expect(last.body.code).toBe('last_pack');
    });
  });

  describe('tenant isolation', () => {
    it("never lets one shop read or change another shop's catalogue", async () => {
      const a = await shopOwner('919999900001', 'Lakshmi Paints');
      const b = await shopOwner('919999900002', 'Shop B Colours');
      const product = (await listCatalogueProduct(a).expect(201))
        .body as ShopProduct;
      const pack = product.packs[0];
      const shade = (
        await call(a, 'post', '/shades', { code: 'LP-1', name: 'Lakshmi Red' })
      ).body as { id: string };

      // B on A's shop id: not a member.
      for (const path of [
        '/products',
        `/products/${product.id}`,
        '/shades',
        '/pack-rows',
      ]) {
        const response = await call(b, 'get', path, undefined, a.shopId).expect(
          404,
        );
        expect(response.body.code).toBe('shop_not_found');
      }
      await call(b, 'post', '/products', {}, a.shopId).expect(404);

      // B on its own shop id with A's record ids: not found.
      const attempts = [
        () => call(b, 'get', `/products/${product.id}`),
        () =>
          call(b, 'patch', `/products/${product.id}`, { status: 'ARCHIVED' }),
        () =>
          call(b, 'post', `/products/${product.id}/packs`, {
            cataloguePackId: product.unlistedCataloguePacks[0].id,
            pricePaise: 100,
          }),
        () =>
          call(b, 'patch', `/products/${product.id}/packs/${pack.id}`, {
            available: false,
          }),
        () => call(b, 'delete', `/products/${product.id}/packs/${pack.id}`),
        () => call(b, 'patch', `/shades/${shade.id}`, { name: 'Taken' }),
        () => call(b, 'delete', `/shades/${shade.id}`),
      ];
      for (const attempt of attempts) {
        const response = await attempt().expect(404);
        expect(response.body.code).toMatch(
          /^shop_(product|pack|shade)_not_found$/,
        );
      }

      // A pack of A's product on B's own product route.
      const own = (await ownProduct(b, 'Primer').expect(201))
        .body as ShopProduct;
      await call(b, 'patch', `/products/${own.id}/packs/${pack.id}`, {
        available: false,
      }).expect(404);

      expect(
        (await call(b, 'get', '/products').expect(200)).body.items,
      ).toEqual([expect.objectContaining({ id: own.id })]);
      expect((await call(b, 'get', '/shades').expect(200)).body.items).toEqual(
        [],
      );
      const rows = (await call(b, 'get', '/pack-rows').expect(200)).body as {
        items: { productId: string }[];
        tabCounts: { ALL: number };
      };
      expect(rows.items.map((row) => row.productId)).toEqual([own.id]);
      expect(rows.tabCounts.ALL).toBe(1);

      // Nothing of A's changed.
      const after = await call(a, 'get', `/products/${product.id}`).expect(200);
      expect(after.body).toMatchObject({
        status: 'ACTIVE',
        packs: product.packs,
      });
    });

    it('requires a signed-in caller', async () => {
      const a = await shopOwner('919999900001', 'Lakshmi Paints');
      await request(server())
        .get(`/v1/shops/${a.shopId}/catalogue/products`)
        .expect(401);
    });
  });

  describe('one add-product flow (CAT-005)', () => {
    it('searches every brand when no brand is given', async () => {
      const a = await shopOwner('919999900001', 'Lakshmi Paints');
      const otherBrand = (
        await platform('post', '/brands', { name: 'Other Paints' })
      ).body.id as string;
      await platform('post', `/brands/${otherBrand}/products`, {
        name: 'Silk Primer',
        categoryId,
        supportsShades: false,
        packs: [{ quantity: 4, unit: 'LITRE' }],
      });
      await listCatalogueProduct(a).expect(201);

      const found = (await call(a, 'get', '/brand-products?q=silk').expect(200))
        .body as {
        items: { product: { name: string }; listedProductId: string | null }[];
      };
      expect(found.items.map((item) => item.product.name)).toEqual([
        'Silk Emulsion',
        'Silk Primer',
      ]);
      expect(found.items[0].listedProductId).not.toBeNull();
      expect(found.items[1].listedProductId).toBeNull();

      await call(a, 'get', '/brand-products').expect(400);
      await call(a, 'get', '/brand-products?q=s').expect(400);
    });

    it('keeps all pack sizes of an own product in one unit (Sold by)', async () => {
      const a = await shopOwner('919999900001', 'Lakshmi Paints');
      const mixed = await ownProduct(a, 'Mixed Primer', {
        packs: [
          { quantity: 1, unit: 'LITRE', pricePaise: 10000 },
          { quantity: 1, unit: 'KILOGRAM', pricePaise: 10000 },
        ],
      }).expect(400);
      expect(JSON.stringify(mixed.body)).toContain('same unit');

      const putty = (
        await ownProduct(a, 'Wall Putty', {
          packs: [
            { quantity: 1, unit: 'KILOGRAM', pricePaise: 12000 },
            { quantity: 500, unit: 'GRAM', pricePaise: 7000 },
          ],
        }).expect(201)
      ).body as ShopProduct;
      const refused = await call(a, 'post', `/products/${putty.id}/packs`, {
        quantity: 4,
        unit: 'LITRE',
        pricePaise: 100,
      }).expect(400);
      expect(refused.body.code).toBe('pack_unit_group_mismatch');
      await call(a, 'post', `/products/${putty.id}/packs`, {
        quantity: 20,
        unit: 'KILOGRAM',
        pricePaise: 90000,
      }).expect(201);
    });
  });

  describe('pack rows (catalogue table)', () => {
    interface RowPage {
      items: {
        productName: string;
        sizeLabel: string;
        pricePaise: number;
        available: boolean;
        brandName: string | null;
      }[];
      total: number;
      page: number;
      pageSize: number;
      tabCounts: Record<'ALL' | 'VOLUME' | 'WEIGHT' | 'PIECE', number>;
      options: Record<
        'brands' | 'categories' | 'sizes',
        { value: string; label: string }[]
      >;
    }
    const rows = async (owner: Owner, query = '') =>
      (await call(owner, 'get', `/pack-rows${query}`).expect(200))
        .body as RowPage;

    it('lists one row per pack with tabs, filters, sort and pages', async () => {
      const a = await shopOwner('919999900001', 'Lakshmi Paints');
      // Silk Emulsion: 1 L (₹450) and 4 L (₹1,450), from the brand catalogue.
      await listCatalogueProduct(a).expect(201);
      // Wall Putty: 1 kg (₹120) and 20 kg; own product, typed brand.
      const putty = (
        await ownProduct(a, 'Wall Putty', {
          packs: [
            { quantity: 1, unit: 'KILOGRAM', pricePaise: 12000 },
            { quantity: 20, unit: 'KILOGRAM', pricePaise: 90000 },
          ],
        }).expect(201)
      ).body as ShopProduct;
      await call(
        a,
        'patch',
        `/products/${putty.id}/packs/${putty.packs[1].id}`,
        { available: false },
      ).expect(200);

      const all = await rows(a);
      expect(all.total).toBe(4);
      expect(all.tabCounts).toEqual({ ALL: 4, VOLUME: 2, WEIGHT: 2, PIECE: 0 });
      expect(all.items.map((r) => `${r.productName} ${r.sizeLabel}`)).toEqual([
        'Silk Emulsion 1 L',
        'Silk Emulsion 4 L',
        'Wall Putty 1 kg',
        'Wall Putty 20 kg',
      ]);
      expect(all.options.brands.map((o) => o.label)).toEqual([
        'Local Brand',
        'Sample Paints',
      ]);

      const weight = await rows(a, '?tab=WEIGHT');
      expect(weight.items.map((r) => r.sizeLabel)).toEqual(['1 kg', '20 kg']);
      expect(weight.options.sizes).toEqual([
        { value: '1:KILOGRAM', label: '1 kg' },
        { value: '20:KILOGRAM', label: '20 kg' },
      ]);

      expect((await rows(a, '?available=false')).items).toEqual([
        expect.objectContaining({
          productName: 'Wall Putty',
          available: false,
        }),
      ]);
      expect(
        (await rows(a, '?size=4:LITRE')).items.map((r) => r.pricePaise),
      ).toEqual([145000]);
      expect((await rows(a, '?q=sample')).total).toBe(2);
      expect((await rows(a, `?brand=${brandId}`)).total).toBe(2);
      expect((await rows(a, '?brand=name:local%20brand')).total).toBe(2);
      expect((await rows(a, `?categoryId=${categoryId}`)).total).toBe(4);

      expect(
        (await rows(a, '?sort=-price')).items.map((r) => r.pricePaise),
      ).toEqual([145000, 90000, 45000, 12000]);
      const page2 = await rows(a, '?pageSize=10&page=1');
      expect(page2).toMatchObject({ page: 1, pageSize: 10, total: 4 });
      expect((await rows(a, '?page=2')).items).toEqual([]);

      await call(a, 'get', '/pack-rows?pageSize=7').expect(400);
      await call(a, 'get', '/pack-rows?size=4L').expect(400);
    });
  });

  describe('shades', () => {
    it('keeps favourite brand shades idempotently', async () => {
      const owner = await shopOwner('919999900001', 'Lakshmi Paints');
      const shades: { id: string }[] = [];
      for (const [code, name] of [
        ['SP-2', 'Sky'],
        ['SP-1', 'Sand'],
      ]) {
        shades.push(
          (await platform('post', `/brands/${brandId}/shades`, { code, name }))
            .body as { id: string },
        );
      }

      for (let i = 0; i < 2; i += 1) {
        await call(owner, 'put', `/favourite-shades/${shades[0].id}`).expect(
          200,
        );
      }
      await call(owner, 'put', `/favourite-shades/${shades[1].id}`).expect(200);
      expect(
        await testApp.prisma.auditEvent.count({
          where: { action: 'shop_catalogue.favourite_shade_added' },
        }),
      ).toBe(2);

      const list = await call(owner, 'get', '/favourite-shades').expect(200);
      expect(
        list.body.items.map(
          (f: { shade: { code: string }; brand: { name: string } }) => [
            f.shade.code,
            f.brand.name,
          ],
        ),
      ).toEqual([
        ['SP-1', 'Sample Paints'],
        ['SP-2', 'Sample Paints'],
      ]);

      const browse = await call(
        owner,
        'get',
        `/brand-shades?brandId=${brandId}`,
      ).expect(200);
      expect(
        browse.body.items.map(
          (i: { shade: { code: string }; favourite: boolean }) => [
            i.shade.code,
            i.favourite,
          ],
        ),
      ).toEqual([
        ['SP-1', true],
        ['SP-2', true],
      ]);

      await call(owner, 'delete', `/favourite-shades/${shades[0].id}`).expect(
        204,
      );
      await call(owner, 'delete', `/favourite-shades/${shades[0].id}`).expect(
        204,
      );
      expect(
        (await call(owner, 'get', '/favourite-shades').expect(200)).body.items,
      ).toHaveLength(1);

      await platform('patch', `/shades/${shades[0].id}`, { active: false });
      const archived = await call(
        owner,
        'put',
        `/favourite-shades/${shades[0].id}`,
      ).expect(404);
      expect(archived.body.code).toBe('shade_not_found');
    });

    it("manages the shop's own shades", async () => {
      const owner = await shopOwner('919999900001', 'Lakshmi Paints');
      const created = await call(owner, 'post', '/shades', {
        code: ' lp  12 ',
        name: ' Temple  Red ',
        previewHex: 'a33',
        brandId,
      }).expect(201);
      expect(created.body).toMatchObject({
        code: 'LP 12',
        name: 'Temple Red',
        previewHex: '#AA3333',
        brand: { id: brandId, name: 'Sample Paints' },
      });
      const duplicate = await call(owner, 'post', '/shades', {
        code: 'LP 12',
        name: 'Again',
      }).expect(409);
      expect(duplicate.body.code).toBe('shop_shade_exists');

      const id = created.body.id as string;
      await call(owner, 'patch', `/shades/${id}`, {
        previewHex: null,
        brandId: null,
      }).expect(200);
      const search = await call(owner, 'get', '/shades?q=temple').expect(200);
      expect(search.body.items).toEqual([
        expect.objectContaining({
          code: 'LP 12',
          previewHex: null,
          brand: null,
        }),
      ]);
      await call(owner, 'delete', `/shades/${id}`).expect(204);
      expect(
        (await call(owner, 'get', '/shades').expect(200)).body.items,
      ).toEqual([]);
    });
  });

  it('counts active products with a pack size on the onboarding checklist', async () => {
    const owner = await shopOwner('919999900001', 'Lakshmi Paints');
    const checklist = async () =>
      (
        (
          await request(server())
            .get(`/v1/shops/${owner.shopId}/onboarding`)
            .set('Authorization', owner.auth)
            .expect(200)
        ).body as {
          items: {
            key: string;
            done: boolean;
            progress?: { current: number; required: number };
          }[];
        }
      ).items.find((item) => item.key === 'products');

    expect(await checklist()).toEqual({
      key: 'products',
      done: false,
      progress: { current: 0, required: 10 },
    });
    const ids: string[] = [];
    for (let i = 1; i <= 10; i += 1) {
      ids.push(
        (
          (await ownProduct(owner, `Product ${i}`).expect(201))
            .body as ShopProduct
        ).id,
      );
    }
    expect(await checklist()).toMatchObject({
      done: true,
      progress: { current: 10 },
    });

    await call(owner, 'patch', `/products/${ids[0]}`, {
      status: 'ARCHIVED',
    }).expect(200);
    expect(await checklist()).toMatchObject({
      done: false,
      progress: { current: 9 },
    });
  });
});
