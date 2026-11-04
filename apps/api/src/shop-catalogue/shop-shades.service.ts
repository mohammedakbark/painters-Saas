import { HttpStatus, Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  AuditAction,
  changedFields,
  recordAuditEvent,
} from '../audit/audit.js';
import type { CurrentUserContext } from '../auth/current-user.js';
import { CatalogueReadService } from '../catalogue/catalogue-read.service.js';
import { SHADE_SELECT, toShade } from '../catalogue/catalogue-mapping.js';
import {
  normaliseHex,
  normaliseShadeCode,
  normaliseText,
} from '../catalogue/catalogue-text.js';
import {
  decodeCursor,
  encodeCursor,
  pageOf,
} from '../common/pagination/keyset-cursor.js';
import type { Prisma } from '../generated/prisma/client.js';
import { isUniqueViolation } from '../prisma/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ShopContext } from '../shop-access/shop-access.guard.js';
import {
  CATALOGUE_MANAGER_ROLES,
  requireShopRole,
} from '../shop-access/shop-roles.js';
import { SHOP_CATALOGUE_LIMITS } from './shop-catalogue-rules.js';
import {
  problem,
  SHOP_SHADE_SELECT,
  shopShadeNotFound,
  toShopShade,
} from './shop-catalogue-mapping.js';
import type {
  BrandShadeBrowsePage,
  CreateShopShadeRequest,
  FavouriteShade,
  FavouriteShadePage,
  ShopShadeListQuery,
  ShopShadePage,
  ShopShadeResponse,
  UpdateShopShadeRequest,
} from './shop-catalogue.schemas.js';

type Tx = Prisma.TransactionClient;
const idSchema = z.uuid();

const FAVOURITE_SELECT = {
  createdAt: true,
  shade: {
    select: { ...SHADE_SELECT, brand: { select: { id: true, name: true } } },
  },
} as const satisfies Prisma.ShopFavouriteShadeSelect;

type FavouriteRow = Prisma.ShopFavouriteShadeGetPayload<{
  select: typeof FAVOURITE_SELECT;
}>;

function toFavourite(row: FavouriteRow): FavouriteShade {
  const { brand, ...shade } = row.shade;
  return {
    shade: toShade(shade),
    brand,
    addedAt: row.createdAt.toISOString(),
  };
}

function codeSearch(q: string | undefined) {
  return q
    ? {
        OR: [
          { code: { contains: q, mode: 'insensitive' as const } },
          { name: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : {};
}

/**
 * Shades of a shop (CAT-002, D-030): favourite brand shades (the ones the shop
 * commonly uses, shown first to its customers later) and the shop's own
 * shade codes. Every query is scoped to the guard-resolved shop.
 */
@Injectable()
export class ShopShadesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogue: CatalogueReadService,
  ) {}

  /** A brand's active shades, each marked when it is a favourite. */
  async browseBrand(
    shop: ShopContext,
    brandId: string,
    query: ShopShadeListQuery,
  ): Promise<BrandShadeBrowsePage> {
    const page = await this.catalogue.shades(brandId, query);
    const favourites = await this.prisma.shopFavouriteShade.findMany({
      where: {
        shopId: shop.shopId,
        shadeId: { in: page.items.map((shade) => shade.id) },
      },
      select: { shadeId: true },
    });
    const ids = new Set(favourites.map((row) => row.shadeId));
    return {
      items: page.items.map((shade) => ({
        shade,
        favourite: ids.has(shade.id),
      })),
      nextCursor: page.nextCursor,
    };
  }

  /** Favourites by shade code (then id), across brands. */
  async favourites(
    shop: ShopContext,
    query: ShopShadeListQuery,
  ): Promise<FavouriteShadePage> {
    const after = query.cursor ? decodeCursor(query.cursor) : undefined;
    const rows = await this.prisma.shopFavouriteShade.findMany({
      where: {
        shopId: shop.shopId,
        AND: [
          query.q ? { shade: codeSearch(query.q) } : {},
          after
            ? {
                OR: [
                  { shade: { code: { gt: after.sortValue } } },
                  {
                    shade: { code: after.sortValue },
                    shadeId: { gt: after.id },
                  },
                ],
              }
            : {},
        ],
      },
      orderBy: [{ shade: { code: 'asc' } }, { shadeId: 'asc' }],
      take: query.limit + 1,
      select: FAVOURITE_SELECT,
    });
    const items = rows.slice(0, query.limit);
    const last = items.at(-1);
    return {
      items: items.map(toFavourite),
      nextCursor:
        rows.length > query.limit && last
          ? encodeCursor(last.shade.code, last.shade.id)
          : null,
    };
  }

  /** Idempotent: adding a favourite twice keeps one. */
  async addFavourite(
    user: CurrentUserContext,
    shop: ShopContext,
    shadeId: string,
  ): Promise<FavouriteShade> {
    requireShopRole(shop, CATALOGUE_MANAGER_ROLES);
    const shade = idSchema.safeParse(shadeId).success
      ? await this.prisma.shade.findFirst({
          where: { id: shadeId, active: true, brand: { active: true } },
          select: { id: true },
        })
      : null;
    if (!shade) {
      throw problem(
        HttpStatus.NOT_FOUND,
        'shade_not_found',
        'Shade not found.',
      );
    }
    const key = { shopId_shadeId: { shopId: shop.shopId, shadeId: shade.id } };
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.shopFavouriteShade.findUnique({
          where: key,
          select: FAVOURITE_SELECT,
        });
        if (existing) {
          return toFavourite(existing);
        }
        const count = await tx.shopFavouriteShade.count({
          where: { shopId: shop.shopId },
        });
        if (count >= SHOP_CATALOGUE_LIMITS.favouriteShades) {
          throw problem(
            HttpStatus.CONFLICT,
            'favourite_limit',
            `You can keep at most ${SHOP_CATALOGUE_LIMITS.favouriteShades} favourite shades.`,
          );
        }
        const row = await tx.shopFavouriteShade.create({
          data: { shopId: shop.shopId, shadeId: shade.id },
          select: FAVOURITE_SELECT,
        });
        await this.audit(
          tx,
          user,
          shop,
          AuditAction.ShopFavouriteShadeAdded,
          'shade',
          shade.id,
        );
        return toFavourite(row);
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        // A concurrent request added it first.
        const row = await this.prisma.shopFavouriteShade.findUniqueOrThrow({
          where: key,
          select: FAVOURITE_SELECT,
        });
        return toFavourite(row);
      }
      throw error;
    }
  }

  /** Idempotent: removing a shade that is not a favourite does nothing. */
  async removeFavourite(
    user: CurrentUserContext,
    shop: ShopContext,
    shadeId: string,
  ): Promise<void> {
    requireShopRole(shop, CATALOGUE_MANAGER_ROLES);
    if (!idSchema.safeParse(shadeId).success) {
      return;
    }
    await this.prisma.$transaction(async (tx) => {
      const removed = await tx.shopFavouriteShade.deleteMany({
        where: { shopId: shop.shopId, shadeId },
      });
      if (removed.count > 0) {
        await this.audit(
          tx,
          user,
          shop,
          AuditAction.ShopFavouriteShadeRemoved,
          'shade',
          shadeId,
        );
      }
    });
  }

  // --- Own shades ------------------------------------------------------------

  async ownShades(
    shop: ShopContext,
    query: ShopShadeListQuery,
  ): Promise<ShopShadePage> {
    const after = query.cursor ? decodeCursor(query.cursor) : undefined;
    const rows = await this.prisma.shopShade.findMany({
      where: {
        shopId: shop.shopId,
        AND: [
          codeSearch(query.q),
          after
            ? {
                OR: [
                  { code: { gt: after.sortValue } },
                  { code: after.sortValue, id: { gt: after.id } },
                ],
              }
            : {},
        ],
      },
      orderBy: [{ code: 'asc' }, { id: 'asc' }],
      take: query.limit + 1,
      select: SHOP_SHADE_SELECT,
    });
    const page = pageOf(rows, query.limit, (row) => row.code);
    return { items: page.items.map(toShopShade), nextCursor: page.nextCursor };
  }

  async createOwn(
    user: CurrentUserContext,
    shop: ShopContext,
    input: CreateShopShadeRequest,
  ): Promise<ShopShadeResponse> {
    requireShopRole(shop, CATALOGUE_MANAGER_ROLES);
    const code = normaliseShadeCode(input.code);
    return this.writeOwn(code, async (tx) => {
      const count = await tx.shopShade.count({
        where: { shopId: shop.shopId },
      });
      if (count >= SHOP_CATALOGUE_LIMITS.ownShades) {
        throw problem(
          HttpStatus.CONFLICT,
          'shop_shade_limit',
          `You can add at most ${SHOP_CATALOGUE_LIMITS.ownShades} shades of your own.`,
        );
      }
      if (input.brandId) {
        await requireActiveBrand(tx, input.brandId);
      }
      const row = await tx.shopShade.create({
        data: {
          shopId: shop.shopId,
          code,
          name: normaliseText(input.name),
          previewHex: input.previewHex ? normaliseHex(input.previewHex) : null,
          brandId: input.brandId ?? null,
        },
        select: SHOP_SHADE_SELECT,
      });
      await this.audit(
        tx,
        user,
        shop,
        AuditAction.ShopShadeAdded,
        'shop_shade',
        row.id,
      );
      return toShopShade(row);
    });
  }

  async updateOwn(
    user: CurrentUserContext,
    shop: ShopContext,
    shadeId: string,
    input: UpdateShopShadeRequest,
  ): Promise<ShopShadeResponse> {
    requireShopRole(shop, CATALOGUE_MANAGER_ROLES);
    const code =
      input.code === undefined ? undefined : normaliseShadeCode(input.code);
    return this.writeOwn(code ?? '', async (tx) => {
      const current = await this.loadOwn(tx, shop, shadeId);
      if (input.brandId) {
        await requireActiveBrand(tx, input.brandId);
      }
      const row = await tx.shopShade.update({
        where: { id: current.id },
        data: {
          code,
          name:
            input.name === undefined ? undefined : normaliseText(input.name),
          previewHex:
            input.previewHex === undefined
              ? undefined
              : input.previewHex === null
                ? null
                : normaliseHex(input.previewHex),
          brandId: input.brandId,
        },
        select: SHOP_SHADE_SELECT,
      });
      await this.audit(
        tx,
        user,
        shop,
        AuditAction.ShopShadeUpdated,
        'shop_shade',
        row.id,
        changedFields(input),
      );
      return toShopShade(row);
    });
  }

  async removeOwn(
    user: CurrentUserContext,
    shop: ShopContext,
    shadeId: string,
  ): Promise<void> {
    requireShopRole(shop, CATALOGUE_MANAGER_ROLES);
    await this.prisma.$transaction(async (tx) => {
      const current = await this.loadOwn(tx, shop, shadeId);
      await tx.shopShade.delete({ where: { id: current.id } });
      await this.audit(
        tx,
        user,
        shop,
        AuditAction.ShopShadeRemoved,
        'shop_shade',
        current.id,
      );
    });
  }

  private async writeOwn<T>(
    code: string,
    work: (tx: Tx) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(work);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw problem(
          HttpStatus.CONFLICT,
          'shop_shade_exists',
          `You already have a shade with the code ${code}.`,
          'code',
        );
      }
      throw error;
    }
  }

  private async loadOwn(tx: Tx, shop: ShopContext, shadeId: string) {
    const row = idSchema.safeParse(shadeId).success
      ? await tx.shopShade.findFirst({
          where: { id: shadeId, shopId: shop.shopId },
          select: { id: true },
        })
      : null;
    if (!row) {
      throw shopShadeNotFound();
    }
    return row;
  }

  private audit(
    tx: Tx,
    user: CurrentUserContext,
    shop: ShopContext,
    action: AuditAction,
    entityType: 'shade' | 'shop_shade',
    entityId: string,
    metadata?: Prisma.InputJsonObject,
  ) {
    return recordAuditEvent(tx, {
      actor: { type: 'USER', userId: user.id },
      action,
      entityType,
      entityId,
      shopId: shop.shopId,
      ...(metadata ? { metadata } : {}),
    });
  }
}

async function requireActiveBrand(tx: Tx, brandId: string) {
  const found = await tx.brand.count({ where: { id: brandId, active: true } });
  if (found === 0) {
    throw problem(
      HttpStatus.BAD_REQUEST,
      'brand_unavailable',
      'Choose one of the listed brands.',
      'brandId',
    );
  }
}
