import { HttpStatus, Injectable } from '@nestjs/common';
import { ProblemException } from '../common/http/problem-details.js';
import type { Prisma } from '../generated/prisma/client.js';
import { ImageStore } from '../media/image-store.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  SHOP_PRODUCT_SELECT,
  toShopProduct,
} from '../shop-catalogue/shop-catalogue-mapping.js';
import {
  type CartCheck,
  type CartCheckRequest,
  PRODUCT_SHADES_MAX,
  type ProductShades,
  type ProductShadesQuery,
  type StorefrontCategories,
  StorefrontPage,
  StorefrontProduct,
  StorefrontQuery,
} from './storefront.schemas.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * What a customer may see of a shop's catalogue: the shop is Live, the
 * product is not archived and has at least one pack, and its catalogue
 * product, brand and category (or its own category) are active.
 */
function visibleProducts(shopId: string): Prisma.ShopProductWhereInput {
  return {
    shopId,
    shop: { status: 'ACTIVE' },
    status: 'ACTIVE',
    packs: { some: {} },
    OR: [
      {
        catalogueProductId: null,
        category: { is: { active: true } },
      },
      {
        catalogueProduct: {
          is: {
            active: true,
            brand: { is: { active: true } },
            category: { is: { active: true } },
          },
        },
      },
    ],
  };
}

function searchProducts(q: string | undefined): Prisma.ShopProductWhereInput {
  if (!q) return {};
  const contains = { contains: q, mode: 'insensitive' as const };
  return {
    AND: [
      {
        OR: [
          { customName: contains },
          { customBrandName: contains },
          { brand: { is: { name: contains } } },
          { catalogueProduct: { is: { name: contains } } },
          { catalogueProduct: { is: { brand: { is: { name: contains } } } } },
        ],
      },
    ],
  };
}

function inCategory(
  categoryId: string | undefined,
): Prisma.ShopProductWhereInput {
  if (!categoryId) return {};
  return {
    AND: [
      {
        OR: [
          { catalogueProductId: null, categoryId },
          { catalogueProduct: { is: { categoryId } } },
        ],
      },
    ],
  };
}

const LIGHT_SELECT = {
  id: true,
  customName: true,
  category: { select: { id: true, name: true } },
  catalogueProduct: {
    select: { name: true, category: { select: { id: true, name: true } } },
  },
} as const satisfies Prisma.ShopProductSelect;

type LightRow = Prisma.ShopProductGetPayload<{ select: typeof LIGHT_SELECT }>;

const nameOf = (row: LightRow) =>
  row.catalogueProduct?.name ?? row.customName ?? '';
const categoryOf = (row: LightRow) =>
  row.catalogueProduct?.category ?? row.category;
const byText = (a: string, b: string) =>
  a.localeCompare(b, 'en', { sensitivity: 'base' });

/**
 * A Live shop's storefront for the Customer App (CUS-003): its categories,
 * products, pack sizes and prices. Read-only; browsing needs no adding
 * (D-037). Only the public allow-list in `storefront.schemas.ts` leaves.
 */
@Injectable()
export class StorefrontService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly images: ImageStore,
  ) {}

  /** Categories that have visible products, by name, with counts. */
  async categories(shopId: string): Promise<StorefrontCategories> {
    await this.requireLiveShop(shopId);
    const rows = await this.prisma.shopProduct.findMany({
      where: visibleProducts(shopId),
      select: LIGHT_SELECT,
    });
    const counts = new Map<string, { id: string; name: string; n: number }>();
    for (const row of rows) {
      const category = categoryOf(row);
      if (!category) continue;
      const entry = counts.get(category.id) ?? { ...category, n: 0 };
      entry.n += 1;
      counts.set(category.id, entry);
    }
    return {
      items: [...counts.values()]
        .sort((a, b) => byText(a.name, b.name))
        .map(({ id, name, n }) => ({ id, name, productCount: n })),
    };
  }

  /** Visible products by name, optionally searched and in one category. */
  async products(
    shopId: string,
    query: StorefrontQuery,
  ): Promise<StorefrontPage> {
    await this.requireLiveShop(shopId);
    const rows = await this.prisma.shopProduct.findMany({
      where: {
        AND: [
          visibleProducts(shopId),
          searchProducts(query.q),
          inCategory(query.categoryId),
        ],
      },
      select: LIGHT_SELECT,
    });
    // Names live on the catalogue product or the own product: sort here.
    const ordered = rows.sort((a, b) => byText(nameOf(a), nameOf(b)));
    const start = (query.page - 1) * query.pageSize;
    const ids = ordered
      .slice(start, start + query.pageSize)
      .map((row) => row.id);
    const full = await this.prisma.shopProduct.findMany({
      where: { id: { in: ids }, shopId },
      select: SHOP_PRODUCT_SELECT,
    });
    const byId = new Map(full.map((row) => [row.id, row]));
    return {
      items: ids.flatMap((id) => {
        const row = byId.get(id);
        return row ? [this.toPublic(row)] : [];
      }),
      total: ordered.length,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /** One visible product of a Live shop. */
  async product(shopId: string, productId: string): Promise<StorefrontProduct> {
    await this.requireLiveShop(shopId);
    const row = UUID.test(productId)
      ? await this.prisma.shopProduct.findFirst({
          where: { AND: [visibleProducts(shopId), { id: productId }] },
          select: SHOP_PRODUCT_SELECT,
        })
      : null;
    if (!row) {
      throw new ProblemException(HttpStatus.NOT_FOUND, {
        detail: 'This product is not available in this shop.',
        code: 'product_not_found',
      });
    }
    return this.toPublic(row);
  }

  /**
   * Shades for a visible product that comes in shades: the shop's favourite
   * brand shades, then the brand's active shade card, then the shop's own
   * codes (of that brand or without a brand), each by code.
   */
  async shades(
    shopId: string,
    productId: string,
    query: ProductShadesQuery,
  ): Promise<ProductShades> {
    const product = await this.product(shopId, productId);
    if (!product.supportsShades) {
      return { items: [], more: false };
    }
    const row = await this.prisma.shopProduct.findFirstOrThrow({
      where: { id: productId, shopId },
      select: {
        brandId: true,
        catalogueProduct: { select: { brandId: true } },
      },
    });
    const brandId = row.catalogueProduct?.brandId ?? row.brandId;
    const text = query.q
      ? {
          OR: [
            { code: { contains: query.q, mode: 'insensitive' as const } },
            { name: { contains: query.q, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const take = PRODUCT_SHADES_MAX + 1;
    const [card, own, favourites] = await Promise.all([
      brandId
        ? this.prisma.shade.findMany({
            where: { brandId, active: true, ...text },
            orderBy: { code: 'asc' },
            take,
            select: { id: true, code: true, name: true, previewHex: true },
          })
        : Promise.resolve([]),
      this.prisma.shopShade.findMany({
        where: {
          AND: [
            { shopId },
            brandId ? { OR: [{ brandId }, { brandId: null }] } : {},
            text,
          ],
        },
        orderBy: { code: 'asc' },
        take,
        select: { code: true, name: true, previewHex: true },
      }),
      this.prisma.shopFavouriteShade.findMany({
        where: { shopId },
        select: { shadeId: true },
      }),
    ]);
    const favouriteIds = new Set(favourites.map((f) => f.shadeId));
    const seen = new Set<string>();
    const items: ProductShades['items'] = [];
    const push = (
      shade: { code: string; name: string; previewHex: string | null },
      favourite: boolean,
    ) => {
      if (seen.has(shade.code)) return;
      seen.add(shade.code);
      items.push({
        code: shade.code,
        name: shade.name,
        previewHex: shade.previewHex,
        favourite,
      });
    };
    for (const shade of card) {
      if (favouriteIds.has(shade.id)) push(shade, true);
    }
    for (const shade of card) push(shade, false);
    for (const shade of own) push(shade, false);
    return {
      items: items.slice(0, PRODUCT_SHADES_MAX),
      more: items.length > PRODUCT_SHADES_MAX,
    };
  }

  /** Today's price and availability of a cart's packs in this shop. */
  async checkCart(shopId: string, input: CartCheckRequest): Promise<CartCheck> {
    await this.requireLiveShop(shopId);
    const rows = await this.prisma.shopProduct.findMany({
      where: {
        AND: [
          visibleProducts(shopId),
          { packs: { some: { id: { in: input.packIds } } } },
        ],
      },
      select: SHOP_PRODUCT_SELECT,
    });
    const wanted = new Set(input.packIds);
    return {
      packs: rows.flatMap((row) => {
        const product = this.toPublic(row);
        return product.packs
          .filter((pack) => wanted.has(pack.id))
          .map((pack) => ({
            packId: pack.id,
            productId: product.id,
            productName: product.name,
            brand: product.brand,
            label: pack.label,
            pricePaise: pack.pricePaise,
            available: pack.available,
            supportsShades: product.supportsShades,
          }));
      }),
    };
  }

  private async requireLiveShop(shopId: string): Promise<void> {
    const live =
      UUID.test(shopId) &&
      (await this.prisma.shop.count({
        where: { id: shopId, status: 'ACTIVE' },
      })) === 1;
    if (!live) {
      throw new ProblemException(HttpStatus.NOT_FOUND, {
        detail: 'This shop was not found.',
        code: 'shop_not_found',
      });
    }
  }

  private toPublic(
    row: Parameters<typeof toShopProduct>[0],
  ): StorefrontProduct {
    const product = toShopProduct(row, this.images);
    const category = product.category;
    if (category === null || category.id === null) {
      // Visible products always have a category (CHECK and the filter).
      throw new Error('A visible product has no category.');
    }
    const packs = product.packs.map((pack) => ({
      id: pack.id,
      quantity: pack.quantity,
      unit: pack.unit,
      label: pack.label,
      pricePaise: pack.pricePaise,
      available: pack.available,
    }));
    const buyable = packs.filter((pack) => pack.available);
    const prices = (buyable.length > 0 ? buyable : packs).map(
      (pack) => pack.pricePaise,
    );
    return {
      id: product.id,
      name: product.name,
      brand: product.brand?.name ?? null,
      category: { id: category.id, name: category.name },
      description: product.description,
      supportsShades: product.supportsShades,
      image: product.image
        ? { url: product.image.url, thumbUrl: product.image.thumbUrl }
        : null,
      packs,
      available: buyable.length > 0,
      fromPricePaise: Math.min(...prices),
    };
  }
}
