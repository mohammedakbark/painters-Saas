import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import request from 'supertest';
import { resetDatabase } from './support/database.js';
import { createTestApp, type TestApp } from './support/test-app.js';
import {
  createTestTokenIssuer,
  type TestTokenIssuer,
} from './support/test-tokens.js';

const PROBLEM_JSON = /application\/problem\+json/;

describe('Brand catalogue (e2e, real Postgres)', () => {
  let issuer: TestTokenIssuer;
  let testApp: TestApp;
  let admin: string;

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
  });

  afterAll(async () => {
    await testApp?.app.close();
  });

  const server = () => testApp.app.getHttpServer();
  const shopOwner = async () =>
    `Bearer ${await issuer.sign({ sub: randomUUID(), phone: '919999900001' })}`;

  const post = (path: string, body: object, auth = admin) =>
    request(server())
      .post(`/v1/platform/catalogue${path}`)
      .set('Authorization', auth)
      .send(body);
  const patch = (path: string, body: object, auth = admin) =>
    request(server())
      .patch(`/v1/platform/catalogue${path}`)
      .set('Authorization', auth)
      .send(body);
  const get = (path: string, auth = admin) =>
    request(server()).get(`/v1${path}`).set('Authorization', auth);

  async function category(name = 'Interior emulsion'): Promise<string> {
    return (await post('/categories', { name }).expect(201)).body.id as string;
  }
  async function brand(name = 'Sample Paints'): Promise<string> {
    return (await post('/brands', { name }).expect(201)).body.id as string;
  }
  async function product(
    brandId: string,
    categoryId: string,
    name = 'Silk Emulsion',
  ) {
    const response = await post(`/brands/${brandId}/products`, {
      name,
      categoryId,
      description: 'Washable interior finish.',
      supportsShades: true,
      packs: [
        { quantity: 1, unit: 'LITRE' },
        { quantity: 4, unit: 'LITRE' },
      ],
    }).expect(201);
    return response.body as {
      id: string;
      packs: { id: string; label: string }[];
    };
  }
  const csv = (text: string) => Buffer.from(text, 'utf8');
  const importFile = (
    brandId: string,
    kind: 'shades' | 'products',
    file: Buffer,
    dryRun: boolean,
  ) =>
    request(server())
      .post(
        `/v1/platform/catalogue/brands/${brandId}/imports/${kind}?dryRun=${dryRun}`,
      )
      .set('Authorization', admin)
      .attach('file', file, {
        filename: `${kind}.csv`,
        contentType: 'text/csv',
      });

  describe('management (platform admins)', () => {
    it('creates categories, brands and products with normalised names and pack labels', async () => {
      const categoryId = await category('  Interior   emulsion ');
      const brandId = await brand(' Sample   Paints ');
      const created = await product(brandId, categoryId);

      expect(created).toMatchObject({
        brand: { id: brandId, name: 'Sample Paints' },
        category: { id: categoryId, name: 'Interior emulsion' },
        name: 'Silk Emulsion',
        supportsShades: true,
        active: true,
        image: null,
      });
      expect(created.packs.map((pack) => pack.label)).toEqual(['1 L', '4 L']);

      const brandView = await get(
        `/platform/catalogue/brands/${brandId}`,
      ).expect(200);
      expect(brandView.body).toMatchObject({ productCount: 1, shadeCount: 0 });

      const actions = (await testApp.prisma.auditEvent.findMany())
        .map((e) => e.action)
        .sort();
      expect(actions).toEqual(
        [
          'catalogue.brand_created',
          'catalogue.category_created',
          'catalogue.product_created',
        ].sort(),
      );
    });

    it('answers 409 for a duplicate name regardless of case, per brand for products', async () => {
      const categoryId = await category();
      const brandId = await brand();
      await product(brandId, categoryId);

      expect(
        (await post('/categories', { name: 'INTERIOR EMULSION' }).expect(409))
          .body.code,
      ).toBe('category_exists');
      expect(
        (await post('/brands', { name: 'sample paints' }).expect(409)).body
          .code,
      ).toBe('brand_exists');
      const duplicate = await post(`/brands/${brandId}/products`, {
        name: 'silk emulsion',
        categoryId,
        packs: [{ quantity: 1, unit: 'LITRE' }],
      }).expect(409);
      expect(duplicate.body.code).toBe('product_exists');

      // The same product name is fine for another brand.
      const otherBrand = await brand('Other Paints');
      await product(otherBrand, categoryId);
    });

    it('validates products: packs, category and archived categories', async () => {
      const categoryId = await category();
      const brandId = await brand();

      const invalid = await post(`/brands/${brandId}/products`, {
        name: 'X',
        categoryId: 'nope',
        packs: [
          { quantity: 1, unit: 'LITRE' },
          { quantity: 1, unit: 'LITRE' },
        ],
      }).expect(400);
      expect(invalid.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(
        invalid.body.errors.map((e: { path: string }) => e.path).sort(),
      ).toEqual(['categoryId', 'name', 'packs']);

      await patch(`/categories/${categoryId}`, { active: false }).expect(200);
      const archived = await post(`/brands/${brandId}/products`, {
        name: 'Silk Emulsion',
        categoryId,
        packs: [{ quantity: 1, unit: 'LITRE' }],
      }).expect(409);
      expect(archived.body.code).toBe('category_archived');
      expect(
        (
          await post(`/brands/${randomUUID()}/products`, {
            name: 'Silk Emulsion',
            categoryId,
            packs: [{ quantity: 1, unit: 'LITRE' }],
          }).expect(404)
        ).body.code,
      ).toBe('brand_not_found');
    });

    it('replaces pack sizes and audits the changed field names only', async () => {
      const categoryId = await category();
      const brandId = await brand();
      const created = await product(brandId, categoryId);

      const updated = await patch(`/products/${created.id}`, {
        name: 'Silk Emulsion Plus',
        packs: [
          { quantity: 4, unit: 'LITRE' },
          { quantity: 10, unit: 'LITRE' },
          { quantity: 0.5, unit: 'LITRE' },
        ],
      }).expect(200);

      expect(updated.body.name).toBe('Silk Emulsion Plus');
      expect(
        updated.body.packs.map((pack: { label: string }) => pack.label),
      ).toEqual(['0.5 L', '4 L', '10 L']);
      const kept = updated.body.packs.find(
        (pack: { label: string }) => pack.label === '4 L',
      );
      expect(kept.id).toBe(
        created.packs.find((pack) => pack.label === '4 L')?.id,
      );

      const event = await testApp.prisma.auditEvent.findFirstOrThrow({
        where: { action: 'catalogue.product_updated' },
      });
      expect(event.metadata).toEqual({ fields: ['name', 'packs'] });
    });

    it('lists products by name with a cursor and search', async () => {
      const categoryId = await category();
      const brandId = await brand();
      for (const name of [
        'Delta Gloss',
        'Alpha Matt',
        'Charlie Satin',
        'Bravo Primer',
      ]) {
        await product(brandId, categoryId, name);
      }

      const first = await get(
        `/platform/catalogue/brands/${brandId}/products?limit=3`,
      ).expect(200);
      expect(first.body.items.map((p: { name: string }) => p.name)).toEqual([
        'Alpha Matt',
        'Bravo Primer',
        'Charlie Satin',
      ]);
      const second = await get(
        `/platform/catalogue/brands/${brandId}/products?limit=3&cursor=${first.body.nextCursor}`,
      ).expect(200);
      expect(second.body).toMatchObject({
        items: [{ name: 'Delta Gloss' }],
        nextCursor: null,
      });

      const search = await get(
        `/platform/catalogue/brands/${brandId}/products?q=SATIN`,
      ).expect(200);
      expect(search.body.items.map((p: { name: string }) => p.name)).toEqual([
        'Charlie Satin',
      ]);

      const bad = await get(
        `/platform/catalogue/brands/${brandId}/products?cursor=garbage`,
      ).expect(400);
      expect(bad.body.code).toBe('invalid_cursor');
    });

    it('manages shades with upper-case codes and indicative colours', async () => {
      const brandId = await brand();
      const shade = await post(`/brands/${brandId}/shades`, {
        code: ' 1p2816 ',
        name: ' Pink  Blush ',
        previewHex: 'e8d5b7',
      }).expect(201);
      expect(shade.body).toMatchObject({
        code: '1P2816',
        name: 'Pink Blush',
        previewHex: '#E8D5B7',
        active: true,
      });

      expect(
        (
          await post(`/brands/${brandId}/shades`, {
            code: '1P2816',
            name: 'Again',
          }).expect(409)
        ).body.code,
      ).toBe('shade_exists');
      const bad = await post(`/brands/${brandId}/shades`, {
        code: '#1',
        name: '',
        previewHex: 'red',
      }).expect(400);
      expect(
        bad.body.errors.map((e: { path: string }) => e.path).sort(),
      ).toEqual(['code', 'name', 'previewHex']);

      await patch(`/shades/${shade.body.id}`, {
        previewHex: null,
        active: false,
      }).expect(200);
      const list = await get(
        `/platform/catalogue/brands/${brandId}/shades`,
      ).expect(200);
      expect(list.body.items).toEqual([
        expect.objectContaining({
          code: '1P2816',
          previewHex: null,
          active: false,
        }),
      ]);
    });

    it('stores a product image through the photo pipeline', async () => {
      const categoryId = await category();
      const brandId = await brand();
      const created = await product(brandId, categoryId);
      const png = await sharp({
        create: { width: 800, height: 800, channels: 3, background: '#cccccc' },
      })
        .png()
        .toBuffer();

      const response = await request(server())
        .put(`/v1/platform/catalogue/products/${created.id}/image`)
        .set('Authorization', admin)
        .attach('image', png, { filename: 'tin.png', contentType: 'image/png' })
        .expect(200);

      expect(response.body.image.url).toMatch(
        new RegExp(
          `/catalogue/products/${created.id}/image/[0-9a-f-]{36}-1600\\.webp$`,
        ),
      );
      expect(testApp.storage.objects.size).toBe(2);

      const notImage = await request(server())
        .put(`/v1/platform/catalogue/products/${created.id}/image`)
        .set('Authorization', admin)
        .attach('image', Buffer.from('text'), 'x.png')
        .expect(400);
      expect(notImage.body.code).toBe('image_unreadable');
    });

    it('answers 403 to shop owners and 401 without a token on every management route', async () => {
      const owner = await shopOwner();
      const brandId = await brand();
      const attempts = [
        () => request(server()).get('/v1/platform/catalogue/brands'),
        () =>
          request(server())
            .post('/v1/platform/catalogue/brands')
            .send({ name: 'Evil' }),
        () =>
          request(server())
            .patch(`/v1/platform/catalogue/brands/${brandId}`)
            .send({ active: false }),
        () =>
          request(server())
            .post(`/v1/platform/catalogue/brands/${brandId}/shades`)
            .send({ code: '1', name: 'x' }),
        () =>
          request(server()).post(
            `/v1/platform/catalogue/brands/${brandId}/imports/shades`,
          ),
      ];
      for (const attempt of attempts) {
        const response = await attempt()
          .set('Authorization', owner)
          .expect(403);
        expect(response.body.code).toBe('platform_admin_required');
        await attempt().expect(401);
      }
      expect(await testApp.prisma.brand.count()).toBe(1);
    });
  });

  describe('read API (any signed-in user)', () => {
    it('shows only active brands, categories, products and shades', async () => {
      const owner = await shopOwner();
      const interior = await category('Interior emulsion');
      const primer = await category('Primer');
      const brandId = await brand();
      await product(brandId, interior, 'Silk Emulsion');
      const archived = await product(brandId, interior, 'Old Emulsion');
      await product(brandId, primer, 'Wall Primer');
      await patch(`/products/${archived.id}`, { active: false }).expect(200);
      await patch(`/categories/${primer}`, { active: false }).expect(200);
      await post(`/brands/${brandId}/shades`, {
        code: '1001',
        name: 'Ivory',
      }).expect(201);
      const hidden = await post(`/brands/${brandId}/shades`, {
        code: '1002',
        name: 'Old Ivory',
      }).expect(201);
      await patch(`/shades/${hidden.body.id}`, { active: false }).expect(200);

      expect(
        (await get('/catalogue/categories', owner).expect(200)).body.items.map(
          (c: { name: string }) => c.name,
        ),
      ).toEqual(['Interior emulsion']);
      const products = await get(
        `/catalogue/brands/${brandId}/products`,
        owner,
      ).expect(200);
      expect(products.body.items.map((p: { name: string }) => p.name)).toEqual([
        'Silk Emulsion',
      ]);
      const shades = await get(
        `/catalogue/brands/${brandId}/shades?q=ivory`,
        owner,
      ).expect(200);
      expect(shades.body.items.map((s: { code: string }) => s.code)).toEqual([
        '1001',
      ]);
      await get(`/catalogue/products/${archived.id}`, owner).expect(404);

      await patch(`/brands/${brandId}`, { active: false }).expect(200);
      expect(
        (await get(`/catalogue/brands/${brandId}`, owner).expect(404)).body
          .code,
      ).toBe('brand_not_found');
      expect(
        (await get('/catalogue/brands', owner).expect(200)).body.items,
      ).toEqual([]);
    });

    it('answers 401 without a token', async () => {
      await request(server()).get('/v1/catalogue/categories').expect(401);
    });
  });

  describe('CSV import', () => {
    it('previews shades, saves nothing on a dry run, then applies all rows', async () => {
      const brandId = await brand();
      const file = csv(
        '﻿Code,Name,Preview_Hex\n1001,Ivory Mist,#F4EFE1\n1002, Sand Dune ,d8c3a5\n1003,Teak,\n',
      );

      const preview = await importFile(brandId, 'shades', file, true).expect(
        200,
      );
      expect(preview.body).toMatchObject({
        dryRun: true,
        applied: false,
        rows: 3,
        created: 3,
        updated: 0,
        errorCount: 0,
      });
      expect(await testApp.prisma.shade.count()).toBe(0);

      const applied = await importFile(brandId, 'shades', file, false).expect(
        200,
      );
      expect(applied.body).toMatchObject({ applied: true, created: 3 });
      const shades = await testApp.prisma.shade.findMany({
        orderBy: { code: 'asc' },
      });
      expect(shades.map((s) => [s.code, s.name, s.previewHex])).toEqual([
        ['1001', 'Ivory Mist', '#F4EFE1'],
        ['1002', 'Sand Dune', '#D8C3A5'],
        ['1003', 'Teak', null],
      ]);

      const again = await importFile(
        brandId,
        'shades',
        csv('code,name\n1001,Ivory Mist\n1002,Desert Sand\n1004,New'),
        false,
      ).expect(200);
      expect(again.body).toMatchObject({
        applied: true,
        created: 1,
        updated: 2,
        unchanged: 0,
      });
      const event = await testApp.prisma.auditEvent.findFirstOrThrow({
        where: { action: 'catalogue.imported' },
      });
      expect(event).toMatchObject({
        entityType: 'brand',
        entityId: brandId,
        metadata: { kind: 'shades', rows: 3, created: 3, updated: 0 },
      });
    });

    it('lists row errors and applies nothing when any row is wrong', async () => {
      const brandId = await brand();
      const result = await importFile(
        brandId,
        'shades',
        csv(
          'code,name,preview_hex\n1001,Ivory,\n#BAD,Bad code,\n1001,Duplicate,\n1005,,\n1006,Colour,purple\n',
        ),
        false,
      ).expect(200);

      expect(result.body).toMatchObject({
        applied: false,
        errorCount: 4,
        created: 0,
      });
      expect(result.body.errors.map((e: { row: number }) => e.row)).toEqual([
        2, 3, 4, 5,
      ]);
      expect(await testApp.prisma.shade.count()).toBe(0);
    });

    it('reports header problems and invalid CSV without echoing the file', async () => {
      const brandId = await brand();
      const header = await importFile(
        brandId,
        'shades',
        csv('shade,name\nx,y'),
        true,
      ).expect(200);
      expect(header.body.errors[0].message).toMatch(
        /Missing columns: code\. Unknown columns: shade\./,
      );

      const broken = await importFile(
        brandId,
        'shades',
        csv('code,name\n"1001,secret-text\n'),
        true,
      ).expect(200);
      expect(broken.body.errors[0].message).toMatch(/not valid CSV/);
      expect(JSON.stringify(broken.body)).not.toContain('secret-text');

      await request(server())
        .post(`/v1/platform/catalogue/brands/${brandId}/imports/shades`)
        .set('Authorization', admin)
        .expect(400);
    });

    it('imports products with categories by name and adds pack sizes on re-import', async () => {
      const brandId = await brand();
      await category('Interior emulsion');
      await category('Primer');

      const first = await importFile(
        brandId,
        'products',
        csv(
          'name,category,packs,description,supports_shades\nSilk Emulsion,interior emulsion,"1 L; 4 L; 10 L",Washable,yes\nWall Primer,Primer,4 L|20 L,,no\n',
        ),
        false,
      ).expect(200);
      expect(first.body).toMatchObject({ applied: true, created: 2 });

      const second = await importFile(
        brandId,
        'products',
        csv(
          'name,category,packs\nsilk emulsion,Interior emulsion,"4 L; 20 L"\nWall Primer,Primer,"4 L, 20 L"\n',
        ),
        false,
      ).expect(200);
      expect(second.body).toMatchObject({
        applied: true,
        created: 0,
        updated: 1,
        unchanged: 1,
      });

      const silk = await get(
        `/platform/catalogue/brands/${brandId}/products?q=silk`,
      ).expect(200);
      expect(silk.body.items[0]).toMatchObject({
        name: 'Silk Emulsion',
        supportsShades: false,
        description: null,
      });
      expect(
        silk.body.items[0].packs.map((p: { label: string }) => p.label),
      ).toEqual(['1 L', '4 L', '10 L', '20 L']);

      const bad = await importFile(
        brandId,
        'products',
        csv('name,category,packs\nNew,Unknown,4 gallons\n'),
        true,
      ).expect(200);
      expect(
        bad.body.errors.map((e: { message: string }) => e.message),
      ).toEqual([
        'The category is not an active catalogue category.',
        '"4 gallons" is not a pack size. Use a number and a unit: L, ml, kg, g or pc.',
      ]);
    });
  });
});
