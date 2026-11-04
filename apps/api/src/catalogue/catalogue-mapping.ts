import { HttpStatus } from '@nestjs/common';
import { ProblemException } from '../common/http/problem-details.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { ImageStore } from '../media/image-store.js';
import type {
  BrandResponse,
  Category,
  ProductResponse,
  ShadeResponse,
} from './catalogue.schemas.js';
import { formatPackSize } from './catalogue-text.js';

/** Database selects and response mappers shared by the catalogue services. */

export const CATEGORY_SELECT = {
  id: true,
  name: true,
  sortOrder: true,
  active: true,
} as const satisfies Prisma.CatalogueCategorySelect;

export const BRAND_SELECT = {
  id: true,
  name: true,
  active: true,
  _count: {
    select: {
      products: { where: { active: true } },
      shades: { where: { active: true } },
    },
  },
} as const satisfies Prisma.BrandSelect;

export const PRODUCT_SELECT = {
  id: true,
  name: true,
  description: true,
  supportsShades: true,
  active: true,
  imageKey: true,
  imageUpdatedAt: true,
  brand: { select: { id: true, name: true } },
  category: { select: { id: true, name: true } },
  packs: {
    select: { id: true, quantity: true, unit: true },
    orderBy: [{ unit: 'asc' }, { quantity: 'asc' }],
  },
} as const satisfies Prisma.CatalogueProductSelect;

export const SHADE_SELECT = {
  id: true,
  brandId: true,
  code: true,
  name: true,
  previewHex: true,
  active: true,
} as const satisfies Prisma.ShadeSelect;

type CategoryRow = Prisma.CatalogueCategoryGetPayload<{
  select: typeof CATEGORY_SELECT;
}>;
type BrandRow = Prisma.BrandGetPayload<{ select: typeof BRAND_SELECT }>;
type ProductRow = Prisma.CatalogueProductGetPayload<{
  select: typeof PRODUCT_SELECT;
}>;
type ShadeRow = Prisma.ShadeGetPayload<{ select: typeof SHADE_SELECT }>;

export function toCategory(row: CategoryRow): Category {
  return { ...row };
}

export function toBrand(row: BrandRow): BrandResponse {
  return {
    id: row.id,
    name: row.name,
    active: row.active,
    productCount: row._count.products,
    shadeCount: row._count.shades,
  };
}

export function toProduct(
  row: ProductRow,
  images: ImageStore,
): ProductResponse {
  return {
    id: row.id,
    brand: row.brand,
    category: row.category,
    name: row.name,
    description: row.description,
    supportsShades: row.supportsShades,
    active: row.active,
    image: images.urls(row.imageKey, row.imageUpdatedAt),
    packs: row.packs.map((pack) => {
      const quantity = pack.quantity.toNumber();
      return {
        id: pack.id,
        quantity,
        unit: pack.unit,
        label: formatPackSize(quantity, pack.unit),
      };
    }),
  };
}

export function toShade(row: ShadeRow): ShadeResponse {
  return { ...row };
}

// --- Problems ----------------------------------------------------------------

export function notFound(
  entity: 'brand' | 'category' | 'product' | 'shade',
): ProblemException {
  const label =
    entity === 'category'
      ? 'Category'
      : entity[0].toUpperCase() + entity.slice(1);
  return new ProblemException(HttpStatus.NOT_FOUND, {
    detail: `${label} not found.`,
    code: `${entity}_not_found`,
  });
}

export function alreadyExists(
  entity: 'brand' | 'category' | 'product' | 'shade',
  detail: string,
): ProblemException {
  return new ProblemException(HttpStatus.CONFLICT, {
    detail,
    code: `${entity}_exists`,
  });
}
