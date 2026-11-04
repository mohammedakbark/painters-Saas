import { HttpStatus } from '@nestjs/common';
import { ProblemException } from '../common/http/problem-details.js';
import { formatPackSize } from '../catalogue/catalogue-text.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PackUnit } from '../generated/prisma/enums.js';
import type { ImageStore } from '../media/image-store.js';
import type {
  ShopPack,
  ShopProductResponse,
  ShopShadeResponse,
} from './shop-catalogue.schemas.js';

/** Database selects and response mappers for the shop catalogue (CAT-002). */

export const SHOP_PRODUCT_SELECT = {
  id: true,
  catalogueProductId: true,
  customName: true,
  customBrandName: true,
  description: true,
  supportsShades: true,
  status: true,
  imageKey: true,
  imageUpdatedAt: true,
  createdAt: true,
  updatedAt: true,
  brand: { select: { id: true, name: true } },
  category: { select: { id: true, name: true } },
  catalogueProduct: {
    select: {
      name: true,
      description: true,
      supportsShades: true,
      active: true,
      imageKey: true,
      imageUpdatedAt: true,
      brand: { select: { id: true, name: true, active: true } },
      category: { select: { id: true, name: true, active: true } },
      packs: {
        select: { id: true, quantity: true, unit: true },
        orderBy: [{ unit: 'asc' }, { quantity: 'asc' }],
      },
    },
  },
  packs: {
    select: {
      id: true,
      cataloguePackId: true,
      quantity: true,
      unit: true,
      mrpPaise: true,
      pricePaise: true,
      available: true,
      cataloguePack: { select: { quantity: true, unit: true } },
    },
  },
} as const satisfies Prisma.ShopProductSelect;

export const SHOP_SHADE_SELECT = {
  id: true,
  code: true,
  name: true,
  previewHex: true,
  brand: { select: { id: true, name: true } },
} as const satisfies Prisma.ShopShadeSelect;

type ShopProductRow = Prisma.ShopProductGetPayload<{
  select: typeof SHOP_PRODUCT_SELECT;
}>;
type ShopShadeRow = Prisma.ShopShadeGetPayload<{
  select: typeof SHOP_SHADE_SELECT;
}>;

const UNIT_ORDER = Object.values(PackUnit);

function byUnitThenQuantity(
  a: { unit: PackUnit; quantity: number },
  b: { unit: PackUnit; quantity: number },
): number {
  return (
    UNIT_ORDER.indexOf(a.unit) - UNIT_ORDER.indexOf(b.unit) ||
    a.quantity - b.quantity
  );
}

function toPack(pack: ShopProductRow['packs'][number]): ShopPack {
  const size = pack.cataloguePack ?? pack;
  if (size.quantity === null || size.unit === null) {
    // The CHECK constraint makes this unreachable.
    throw new Error('A shop pack has no size.');
  }
  const quantity = size.quantity.toNumber();
  return {
    id: pack.id,
    cataloguePackId: pack.cataloguePackId,
    quantity,
    unit: size.unit,
    label: formatPackSize(quantity, size.unit),
    mrpPaise: pack.mrpPaise,
    pricePaise: pack.pricePaise,
    available: pack.available,
  };
}

export function toShopProduct(
  row: ShopProductRow,
  images: ImageStore,
): ShopProductResponse {
  const packs = row.packs.map(toPack).sort(byUnitThenQuantity);
  const shopImage = images.urls(row.imageKey, row.imageUpdatedAt);
  const common = {
    id: row.id,
    status: row.status,
    packs,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };

  const listed = row.catalogueProduct;
  if (listed) {
    const listedIds = new Set(packs.map((pack) => pack.cataloguePackId));
    const catalogueImage = images.urls(listed.imageKey, listed.imageUpdatedAt);
    return {
      ...common,
      source: 'catalogue',
      catalogueProductId: row.catalogueProductId,
      name: listed.name,
      brand: { id: listed.brand.id, name: listed.brand.name },
      category: { id: listed.category.id, name: listed.category.name },
      description: listed.description,
      supportsShades: listed.supportsShades,
      catalogueActive:
        listed.active && listed.brand.active && listed.category.active,
      image: shopImage ?? catalogueImage,
      imageSource: shopImage ? 'shop' : catalogueImage ? 'catalogue' : null,
      unlistedCataloguePacks: listed.packs
        .filter((pack) => !listedIds.has(pack.id))
        .map((pack) => {
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

  if (row.customName === null || row.category === null) {
    // The CHECK constraint makes this unreachable.
    throw new Error('An own shop product has no name or category.');
  }
  return {
    ...common,
    source: 'own',
    catalogueProductId: null,
    name: row.customName,
    brand: row.brand
      ? { id: row.brand.id, name: row.brand.name }
      : row.customBrandName
        ? { id: null, name: row.customBrandName }
        : null,
    category: row.category,
    description: row.description,
    supportsShades: row.supportsShades ?? false,
    catalogueActive: true,
    image: shopImage,
    imageSource: shopImage ? 'shop' : null,
    unlistedCataloguePacks: [],
  };
}

export function toShopShade(row: ShopShadeRow): ShopShadeResponse {
  return { ...row };
}

// --- Problems ----------------------------------------------------------------

export function problem(
  status: HttpStatus,
  code: string,
  detail: string,
  path?: string,
): ProblemException {
  return new ProblemException(status, {
    code,
    detail,
    ...(path ? { errors: [{ path, message: detail }] } : {}),
  });
}

export const shopProductNotFound = () =>
  problem(HttpStatus.NOT_FOUND, 'shop_product_not_found', 'Product not found.');
export const shopPackNotFound = () =>
  problem(HttpStatus.NOT_FOUND, 'shop_pack_not_found', 'Pack size not found.');
export const shopShadeNotFound = () =>
  problem(HttpStatus.NOT_FOUND, 'shop_shade_not_found', 'Shade not found.');
