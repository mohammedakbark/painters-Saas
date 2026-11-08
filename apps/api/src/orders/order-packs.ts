import { HttpStatus } from '@nestjs/common';
import { formatPackSize } from '../catalogue/catalogue-text.js';
import type { Prisma } from '../generated/prisma/client.js';
import { problem } from '../shop-catalogue/shop-catalogue-mapping.js';

/** What an order line copies from the pack when it is ordered (ORD-001). */
export interface PackSnapshot {
  shopProductPackId: string;
  productName: string;
  brandName: string | null;
  packLabel: string;
  unitPricePaise: number;
  supportsShades: boolean;
}

const PACK_SELECT = {
  id: true,
  pricePaise: true,
  available: true,
  quantity: true,
  unit: true,
  cataloguePack: { select: { quantity: true, unit: true } },
  product: {
    select: {
      status: true,
      customName: true,
      customBrandName: true,
      supportsShades: true,
      brand: { select: { name: true } },
      catalogueProduct: {
        select: {
          name: true,
          active: true,
          supportsShades: true,
          brand: { select: { name: true } },
        },
      },
    },
  },
} as const satisfies Prisma.ShopProductPackSelect;

/**
 * Loads a pack of this shop that customers can order: the product is on sale
 * (and still active in the brand catalogue) and the size is available (D-029).
 * Another shop's pack is "not found", never "not available".
 */
export async function loadSellablePack(
  tx: Prisma.TransactionClient,
  shopId: string,
  shopProductPackId: string,
): Promise<PackSnapshot> {
  const pack = await tx.shopProductPack.findFirst({
    where: { id: shopProductPackId, shopId },
    select: PACK_SELECT,
  });
  if (!pack) {
    throw problem(
      HttpStatus.NOT_FOUND,
      'shop_pack_not_found',
      'Pack size not found.',
      'shopProductPackId',
    );
  }
  const { product } = pack;
  const listed = product.catalogueProduct;
  if (
    !pack.available ||
    product.status !== 'ACTIVE' ||
    (listed !== null && !listed.active)
  ) {
    throw problem(
      HttpStatus.CONFLICT,
      'pack_not_available',
      'This pack size is not available.',
      'shopProductPackId',
    );
  }
  const size = pack.cataloguePack ?? pack;
  if (size.quantity === null || size.unit === null) {
    // The CHECK constraint makes this unreachable.
    throw new Error('A shop pack has no size.');
  }
  return {
    shopProductPackId: pack.id,
    productName: listed?.name ?? product.customName ?? '',
    brandName:
      listed?.brand.name ??
      product.brand?.name ??
      product.customBrandName ??
      null,
    packLabel: formatPackSize(size.quantity.toNumber(), size.unit),
    unitPricePaise: pack.pricePaise,
    supportsShades: listed?.supportsShades ?? product.supportsShades ?? false,
  };
}
