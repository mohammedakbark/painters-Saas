import { Controller, Get, Injectable } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { z } from 'zod';
import { ProblemDetailsSchema } from '../common/http/problem-details.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CurrentShop,
  type ShopContext,
  ShopScoped,
} from '../shop-access/shop-access.guard.js';

export const ShopCatalogueSummarySchema = z
  .object({
    products: z.object({
      active: z.int(),
      archived: z.int(),
      /** Active products by availability, as the product list filters them. */
      allAvailable: z.int(),
      partlyAvailable: z.int(),
      noneAvailable: z.int(),
      /** Active own products without a photo (customers see a placeholder). */
      ownWithoutPhoto: z.int(),
    }),
    shades: z.object({ favourites: z.int(), own: z.int() }),
    ownCategories: z.int().meta({ description: 'Active own categories.' }),
  })
  .meta({ id: 'ShopCatalogueSummary' });

export type ShopCatalogueSummary = z.infer<typeof ShopCatalogueSummarySchema>;

interface ProductCounts {
  active: bigint;
  archived: bigint;
  all_available: bigint;
  partly_available: bigint;
  none_available: bigint;
  own_without_photo: bigint;
}

/**
 * Counts for the shop's Overview (WEB-008). Members read; every count is
 * scoped to the shop from verified membership.
 */
@Injectable()
export class ShopSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(shop: ShopContext): Promise<ShopCatalogueSummary> {
    const [rows, favourites, own, ownCategories] = await Promise.all([
      this.prisma.$queryRaw<ProductCounts[]>`
        SELECT
          count(*) FILTER (WHERE p.status = 'ACTIVE') AS active,
          count(*) FILTER (WHERE p.status = 'ARCHIVED') AS archived,
          count(*) FILTER (WHERE p.status = 'ACTIVE' AND k.available = k.total) AS all_available,
          count(*) FILTER (WHERE p.status = 'ACTIVE' AND k.available > 0 AND k.available < k.total) AS partly_available,
          count(*) FILTER (WHERE p.status = 'ACTIVE' AND k.total > 0 AND k.available = 0) AS none_available,
          count(*) FILTER (WHERE p.status = 'ACTIVE' AND p.catalogue_product_id IS NULL AND p.image_key IS NULL) AS own_without_photo
        FROM shop_products p
        CROSS JOIN LATERAL (
          SELECT count(*) AS total, count(*) FILTER (WHERE pack.available) AS available
          FROM shop_product_packs pack
          WHERE pack.shop_product_id = p.id
        ) k
        WHERE p.shop_id = ${shop.shopId}::uuid`,
      this.prisma.shopFavouriteShade.count({ where: { shopId: shop.shopId } }),
      this.prisma.shopShade.count({ where: { shopId: shop.shopId } }),
      this.prisma.catalogueCategory.count({
        where: { shopId: shop.shopId, active: true },
      }),
    ]);
    const counts = rows[0];
    const n = (value: bigint | undefined) => Number(value ?? 0);
    return {
      products: {
        active: n(counts?.active),
        archived: n(counts?.archived),
        allAvailable: n(counts?.all_available),
        partlyAvailable: n(counts?.partly_available),
        noneAvailable: n(counts?.none_available),
        ownWithoutPhoto: n(counts?.own_without_photo),
      },
      shades: { favourites, own },
      ownCategories,
    };
  }
}

/** The Overview's catalogue counts (WEB-008). */
@ApiTags('shop catalogue')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ standardSchema: ProblemDetailsSchema })
@Controller('shops/:shopId/catalogue/summary')
export class ShopSummaryController {
  constructor(private readonly summaries: ShopSummaryService) {}

  @Get()
  @ShopScoped()
  @ApiOperation({
    summary:
      'Counts for the overview: products by status and availability, products without a photo, shades and own categories.',
  })
  @ApiOkResponse({ standardSchema: ShopCatalogueSummarySchema })
  get(@CurrentShop() shop: ShopContext): Promise<ShopCatalogueSummary> {
    return this.summaries.summary(shop);
  }
}
