import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { AuditAction, recordAuditEvent } from '../audit/audit.js';
import { nameKey } from '../catalogue/catalogue-text.js';
import { Prisma } from '../generated/prisma/client.js';
import type { PackUnit } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Local development only: loads generic categories and one clearly FICTIONAL
 * brand ("Demo Paints (sample)") with 12 products and 24 shades, so the shop
 * catalogue can be tried without real brand data (D-030: real catalogues are
 * imported by platform admins from official shade cards, never scraped).
 *
 *   pnpm --filter api catalogue:seed-sample
 *
 * Idempotent: existing rows (matched by name / code) are left as they are.
 * Refuses to run when NODE_ENV=production.
 */
const CATEGORIES = [
  'Interior emulsion',
  'Exterior emulsion',
  'Primer',
  'Wall putty',
  'Enamel',
  'Wood finish',
  'Waterproofing',
];

const BRAND = 'Demo Paints (sample)';

type Pack = [number, PackUnit];
const L = (q: number): Pack => [q, 'LITRE'];
const KG = (q: number): Pack => [q, 'KILOGRAM'];

const PRODUCTS: {
  name: string;
  category: string;
  supportsShades: boolean;
  packs: Pack[];
}[] = [
  {
    name: 'Demo Silk Interior Emulsion',
    category: 'Interior emulsion',
    supportsShades: true,
    packs: [L(1), L(4), L(10), L(20)],
  },
  {
    name: 'Demo Matt Interior Emulsion',
    category: 'Interior emulsion',
    supportsShades: true,
    packs: [L(1), L(4), L(10), L(20)],
  },
  {
    name: 'Demo Economy Distemper',
    category: 'Interior emulsion',
    supportsShades: true,
    packs: [KG(2), KG(5), KG(10)],
  },
  {
    name: 'Demo Weathercoat Exterior',
    category: 'Exterior emulsion',
    supportsShades: true,
    packs: [L(1), L(4), L(10), L(20)],
  },
  {
    name: 'Demo Smooth Exterior',
    category: 'Exterior emulsion',
    supportsShades: true,
    packs: [L(4), L(10), L(20)],
  },
  {
    name: 'Demo Interior Wall Primer',
    category: 'Primer',
    supportsShades: false,
    packs: [L(4), L(10), L(20)],
  },
  {
    name: 'Demo Exterior Wall Primer',
    category: 'Primer',
    supportsShades: false,
    packs: [L(4), L(10), L(20)],
  },
  {
    name: 'Demo Smooth Wall Putty',
    category: 'Wall putty',
    supportsShades: false,
    packs: [KG(5), KG(20), KG(40)],
  },
  {
    name: 'Demo Gloss Enamel',
    category: 'Enamel',
    supportsShades: true,
    packs: [[0.5, 'LITRE'], L(1), L(4)],
  },
  {
    name: 'Demo Satin Enamel',
    category: 'Enamel',
    supportsShades: true,
    packs: [[0.5, 'LITRE'], L(1), L(4)],
  },
  {
    name: 'Demo Clear Wood Varnish',
    category: 'Wood finish',
    supportsShades: false,
    packs: [[0.5, 'LITRE'], L(1), L(4)],
  },
  {
    name: 'Demo Roof Guard',
    category: 'Waterproofing',
    supportsShades: false,
    packs: [L(4), L(10), L(20)],
  },
];

const SHADE_NAMES = [
  ['Morning Ivory', '#F3EBDD'],
  ['Rice Paper', '#EFE8DA'],
  ['Soft Sand', '#E3D3B5'],
  ['Monsoon Grey', '#9AA1A6'],
  ['Backwater Blue', '#5B8DB8'],
  ['Coconut Shell', '#8A6A4F'],
  ['Banana Leaf', '#7FA35B'],
  ['Lotus Pink', '#E7B7C3'],
  ['Spice Orange', '#D9822B'],
  ['Temple Red', '#A63A2B'],
  ['Laterite', '#B5643C'],
  ['Pepper Black', '#2E2B29'],
  ['Cardamom Green', '#9DB38A'],
  ['Lagoon Teal', '#3D8C8A'],
  ['Jasmine White', '#F7F4EC'],
  ['Clay Pot', '#C07A52'],
  ['Mango Yellow', '#F2C14E'],
  ['Evening Mauve', '#9C7A97'],
  ['Rain Cloud', '#B9BEC2'],
  ['Kasavu Gold', '#D6B25E'],
  ['Teak Brown', '#6E4B32'],
  ['Sea Breeze', '#A9CFD8'],
  ['Hill Fog', '#D5D9D6'],
  ['Turmeric', '#E2A83B'],
] as const;

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to load sample catalogue data in production.');
    process.exitCode = 1;
    return;
  }
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const prisma = app.get(PrismaService);
    const counts = await prisma.$transaction(
      async (tx) => {
        let created = 0;
        const categoryIds = new Map<string, string>();
        for (const [index, name] of CATEGORIES.entries()) {
          const existing = await tx.catalogueCategory.findUnique({
            where: { nameKey: nameKey(name) },
          });
          const row =
            existing ??
            (await tx.catalogueCategory.create({
              data: {
                name,
                nameKey: nameKey(name),
                sortOrder: (index + 1) * 10,
              },
            }));
          created += existing ? 0 : 1;
          categoryIds.set(name, row.id);
        }

        const brand =
          (await tx.brand.findUnique({ where: { nameKey: nameKey(BRAND) } })) ??
          (await tx.brand.create({
            data: { name: BRAND, nameKey: nameKey(BRAND) },
          }));

        for (const product of PRODUCTS) {
          const key = nameKey(product.name);
          const exists = await tx.catalogueProduct.findUnique({
            where: { brandId_nameKey: { brandId: brand.id, nameKey: key } },
          });
          if (exists) {
            continue;
          }
          await tx.catalogueProduct.create({
            data: {
              brandId: brand.id,
              categoryId: categoryIds.get(product.category) as string,
              name: product.name,
              nameKey: key,
              description:
                'Sample product for local development. Not a real product.',
              supportsShades: product.supportsShades,
              packs: {
                create: product.packs.map(([quantity, unit]) => ({
                  quantity: new Prisma.Decimal(quantity.toFixed(3)),
                  unit,
                })),
              },
            },
          });
          created += 1;
        }

        const shades = await tx.shade.createMany({
          data: SHADE_NAMES.map(([name, previewHex], index) => ({
            brandId: brand.id,
            code: `DM-${String(index + 1).padStart(3, '0')}`,
            name,
            previewHex,
          })),
          skipDuplicates: true,
        });
        created += shades.count;

        if (created === 0) {
          return 0;
        }
        await recordAuditEvent(tx, {
          actor: { type: 'SYSTEM' },
          action: AuditAction.CatalogueImported,
          entityType: 'brand',
          entityId: brand.id,
          metadata: { kind: 'sample', created },
        });
        return created;
      },
      { timeout: 60_000 },
    );
    console.log(
      counts === 0
        ? 'Sample catalogue already present. Nothing changed.'
        : `Loaded the sample catalogue (${counts} new rows).`,
    );
  } finally {
    await app.close();
  }
}

void main();
