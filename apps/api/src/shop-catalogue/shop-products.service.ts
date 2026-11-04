import { HttpStatus, Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  AuditAction,
  changedFields,
  recordAuditEvent,
} from '../audit/audit.js';
import type { CurrentUserContext } from '../auth/current-user.js';
import { CatalogueReadService } from '../catalogue/catalogue-read.service.js';
import { CATALOGUE_LIMITS } from '../catalogue/catalogue-text.js';
import {
  blankToNull,
  nameKey,
  normaliseText,
} from '../catalogue/catalogue-text.js';
import {
  decodeCursor,
  encodeCursor,
} from '../common/pagination/keyset-cursor.js';
import type { Prisma } from '../generated/prisma/client.js';
import { ImageStore } from '../media/image-store.js';
import { isUniqueViolation } from '../prisma/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ShopContext } from '../shop-access/shop-access.guard.js';
import {
  CATALOGUE_MANAGER_ROLES,
  requireShopRole,
} from '../shop-access/shop-roles.js';
import {
  problem,
  SHOP_PRODUCT_SELECT,
  shopPackNotFound,
  shopProductNotFound,
  toShopProduct,
} from './shop-catalogue-mapping.js';
import type {
  AddShopPackRequest,
  AddShopProductRequest,
  BrandBrowsePage,
  BrandBrowseQuery,
  ShopProductListQuery,
  ShopProductPage,
  ShopProductResponse,
  UpdateShopPackRequest,
  UpdateShopProductRequest,
} from './shop-catalogue.schemas.js';

type Tx = Prisma.TransactionClient;
const idSchema = z.uuid();

const OWN_ONLY_FIELDS = [
  'name',
  'categoryId',
  'brandId',
  'brandName',
  'description',
  'supportsShades',
] as const;

/**
 * Products a shop sells (CAT-002): listings of brand-catalogue products and
 * the shop's own products, with per-pack prices and availability (D-029).
 *
 * Tenant boundary: every query filters on the `shopId` resolved by
 * `ShopAccessGuard`, never on an id from the request alone. A product or pack
 * id of another shop is answered with the same 404 as an unknown id.
 */
@Injectable()
export class ShopProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly images: ImageStore,
    private readonly catalogue: CatalogueReadService,
  ) {}

  async list(
    shop: ShopContext,
    query: ShopProductListQuery,
  ): Promise<ShopProductPage> {
    const after = query.cursor ? decodeCursor(query.cursor) : undefined;
    const contains = query.q
      ? { contains: query.q, mode: 'insensitive' as const }
      : undefined;
    // Newest first: ids are UUIDv7, so id order is creation order.
    const rows = await this.prisma.shopProduct.findMany({
      where: {
        shopId: shop.shopId,
        status: query.status,
        ...(query.catalogueProductId
          ? { catalogueProductId: query.catalogueProductId }
          : {}),
        ...(contains
          ? {
              OR: [
                { customName: contains },
                { customBrandName: contains },
                { brand: { is: { name: contains } } },
                { catalogueProduct: { is: { name: contains } } },
                {
                  catalogueProduct: {
                    is: { brand: { is: { name: contains } } },
                  },
                },
              ],
            }
          : {}),
        ...(after ? { id: { lt: after.id } } : {}),
      },
      orderBy: { id: 'desc' },
      take: query.limit + 1,
      select: SHOP_PRODUCT_SELECT,
    });
    const items = rows.slice(0, query.limit);
    const last = items.at(-1);
    return {
      items: items.map((row) => toShopProduct(row, this.images)),
      nextCursor:
        rows.length > query.limit && last
          ? encodeCursor(last.id, last.id)
          : null,
    };
  }

  async get(
    shop: ShopContext,
    productId: string,
  ): Promise<ShopProductResponse> {
    return toShopProduct(
      await this.load(this.prisma, shop, productId),
      this.images,
    );
  }

  /** A brand's catalogue products, each with the shop's listing (if any). */
  async browseBrand(
    shop: ShopContext,
    query: BrandBrowseQuery,
  ): Promise<BrandBrowsePage> {
    const page = await this.catalogue.products(query.brandId, query);
    const listings = await this.prisma.shopProduct.findMany({
      where: {
        shopId: shop.shopId,
        catalogueProductId: { in: page.items.map((item) => item.id) },
      },
      select: { id: true, catalogueProductId: true },
    });
    const listed = new Map(
      listings.map((row) => [row.catalogueProductId, row.id]),
    );
    return {
      items: page.items.map((product) => ({
        product,
        listedProductId: listed.get(product.id) ?? null,
      })),
      nextCursor: page.nextCursor,
    };
  }

  async add(
    user: CurrentUserContext,
    shop: ShopContext,
    input: AddShopProductRequest,
  ): Promise<ShopProductResponse> {
    requireShopRole(shop, CATALOGUE_MANAGER_ROLES);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const data =
          input.source === 'catalogue'
            ? await this.catalogueListingData(tx, shop, input)
            : await this.ownProductData(tx, shop, input);
        const row = await tx.shopProduct.create({
          data,
          select: SHOP_PRODUCT_SELECT,
        });
        await this.audit(tx, user, shop, AuditAction.ShopProductAdded, row.id, {
          source: input.source,
          packs: input.packs.length,
        });
        return toShopProduct(row, this.images);
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw input.source === 'catalogue'
          ? alreadyListed()
          : ownProductExists(input.name);
      }
      throw error;
    }
  }

  async update(
    user: CurrentUserContext,
    shop: ShopContext,
    productId: string,
    input: UpdateShopProductRequest,
  ): Promise<ShopProductResponse> {
    requireShopRole(shop, CATALOGUE_MANAGER_ROLES);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const current = await this.load(tx, shop, productId);
        const ownFields = OWN_ONLY_FIELDS.filter(
          (field) => input[field] !== undefined,
        );
        if (current.catalogueProductId !== null && ownFields.length > 0) {
          throw problem(
            HttpStatus.BAD_REQUEST,
            'catalogue_listing_read_only',
            "Products from the brand catalogue keep the catalogue's name, brand, category and description. You can change the packs, prices, availability and photo.",
          );
        }

        const data: Prisma.ShopProductUncheckedUpdateInput = {
          status: input.status,
        };
        if (input.name !== undefined) {
          data.customName = normaliseText(input.name);
          data.customNameKey = nameKey(input.name);
        }
        if (input.categoryId !== undefined) {
          await requireActiveCategory(tx, input.categoryId);
          data.categoryId = input.categoryId;
        }
        if (input.brandId !== undefined || input.brandName !== undefined) {
          // Either field replaces the brand; brandId null clears it.
          if (input.brandId) {
            await requireActiveBrand(tx, input.brandId);
          }
          data.brandId = input.brandId ?? null;
          data.customBrandName = input.brandName
            ? normaliseText(input.brandName)
            : null;
        }
        if (input.description !== undefined) {
          data.description = blankToNull(input.description);
        }
        if (input.supportsShades !== undefined) {
          data.supportsShades = input.supportsShades;
        }

        const row = await tx.shopProduct.update({
          where: { id: current.id },
          data,
          select: SHOP_PRODUCT_SELECT,
        });
        await this.audit(
          tx,
          user,
          shop,
          AuditAction.ShopProductUpdated,
          row.id,
          changedFields(input),
        );
        return toShopProduct(row, this.images);
      });
    } catch (error) {
      if (isUniqueViolation(error) && input.name !== undefined) {
        throw ownProductExists(input.name);
      }
      throw error;
    }
  }

  /** The shop's own photo of a product (ADR 0007 pipeline). */
  async replaceImage(
    user: CurrentUserContext,
    shop: ShopContext,
    productId: string,
    buffer: Buffer | undefined,
  ): Promise<ShopProductResponse> {
    requireShopRole(shop, CATALOGUE_MANAGER_ROLES);
    await this.load(this.prisma, shop, productId);
    const image = await this.images.store(
      `shops/${shop.shopId}/products/${productId}/image`,
      buffer,
      'image',
    );
    let previous: string | null;
    let result: ShopProductResponse;
    try {
      [previous, result] = await this.prisma.$transaction(async (tx) => {
        const before = await this.load(tx, shop, productId);
        const row = await tx.shopProduct.update({
          where: { id: before.id },
          data: { imageKey: image.key, imageUpdatedAt: new Date() },
          select: SHOP_PRODUCT_SELECT,
        });
        await this.audit(
          tx,
          user,
          shop,
          AuditAction.ShopProductImageUpdated,
          row.id,
          {
            replaced: before.imageKey !== null,
            width: image.width,
            height: image.height,
          },
        );
        return [before.imageKey, toShopProduct(row, this.images)] as const;
      });
    } catch (error) {
      await this.images.deleteQuietly(image.key);
      throw error;
    }
    await this.images.deleteQuietly(previous);
    return result;
  }

  async addPack(
    user: CurrentUserContext,
    shop: ShopContext,
    productId: string,
    input: AddShopPackRequest,
  ): Promise<ShopProductResponse> {
    requireShopRole(shop, CATALOGUE_MANAGER_ROLES);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const product = await this.lockProduct(tx, shop, productId);
        if (product.packCount >= CATALOGUE_LIMITS.packsPerProduct) {
          throw problem(
            HttpStatus.CONFLICT,
            'pack_limit',
            `A product can have at most ${CATALOGUE_LIMITS.packsPerProduct} pack sizes.`,
          );
        }
        const size = await this.packSize(tx, product.catalogueProductId, input);
        await tx.shopProductPack.create({
          data: {
            shopId: shop.shopId,
            shopProductId: product.id,
            ...size,
            mrpPaise: input.mrpPaise ?? null,
            pricePaise: input.pricePaise,
            available: input.available,
          },
        });
        await this.audit(
          tx,
          user,
          shop,
          AuditAction.ShopPackAdded,
          product.id,
          {
            fields: ['pricePaise', ...(input.mrpPaise ? ['mrpPaise'] : [])],
          },
        );
        return toShopProduct(
          await this.load(tx, shop, product.id),
          this.images,
        );
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw problem(
          HttpStatus.CONFLICT,
          'pack_exists',
          'This pack size is already listed.',
        );
      }
      throw error;
    }
  }

  async updatePack(
    user: CurrentUserContext,
    shop: ShopContext,
    productId: string,
    packId: string,
    input: UpdateShopPackRequest,
  ): Promise<ShopProductResponse> {
    requireShopRole(shop, CATALOGUE_MANAGER_ROLES);
    return this.prisma.$transaction(async (tx) => {
      const pack = await this.loadPack(tx, shop, productId, packId);
      const mrpPaise =
        input.mrpPaise === undefined ? pack.mrpPaise : input.mrpPaise;
      const pricePaise = input.pricePaise ?? pack.pricePaise;
      if (mrpPaise !== null && pricePaise > mrpPaise) {
        throw problem(
          HttpStatus.BAD_REQUEST,
          'price_above_mrp',
          'The price cannot be more than the MRP.',
          'pricePaise',
        );
      }
      const available = input.available ?? pack.available;
      // Forms send every field; the audit names only the ones that changed.
      const fields = [
        ...(mrpPaise === pack.mrpPaise ? [] : ['mrpPaise']),
        ...(pricePaise === pack.pricePaise ? [] : ['pricePaise']),
        ...(available === pack.available ? [] : ['available']),
      ];
      if (fields.length > 0) {
        await tx.shopProductPack.update({
          where: { id: pack.id },
          data: { mrpPaise, pricePaise, available },
        });
        await this.audit(
          tx,
          user,
          shop,
          AuditAction.ShopPackUpdated,
          pack.shopProductId,
          { fields },
        );
      }
      return toShopProduct(
        await this.load(tx, shop, pack.shopProductId),
        this.images,
      );
    });
  }

  async removePack(
    user: CurrentUserContext,
    shop: ShopContext,
    productId: string,
    packId: string,
  ): Promise<ShopProductResponse> {
    requireShopRole(shop, CATALOGUE_MANAGER_ROLES);
    return this.prisma.$transaction(async (tx) => {
      const product = await this.lockProduct(tx, shop, productId);
      const pack = await this.loadPack(tx, shop, product.id, packId);
      if (product.packCount <= 1) {
        throw problem(
          HttpStatus.CONFLICT,
          'last_pack',
          'A product needs at least one pack size. Archive the product to stop selling it.',
        );
      }
      await tx.shopProductPack.delete({ where: { id: pack.id } });
      await this.audit(
        tx,
        user,
        shop,
        AuditAction.ShopPackRemoved,
        product.id,
        { packs: product.packCount - 1 },
      );
      return toShopProduct(await this.load(tx, shop, product.id), this.images);
    });
  }

  // --- Helpers ---------------------------------------------------------------

  private async load(
    db: Tx | PrismaService,
    shop: ShopContext,
    productId: string,
  ) {
    const row = idSchema.safeParse(productId).success
      ? await db.shopProduct.findFirst({
          where: { id: productId, shopId: shop.shopId },
          select: SHOP_PRODUCT_SELECT,
        })
      : null;
    if (!row) {
      throw shopProductNotFound();
    }
    return row;
  }

  /**
   * Locks the product row for the rest of the transaction, so concurrent pack
   * changes cannot both pass the pack-count checks.
   */
  private async lockProduct(tx: Tx, shop: ShopContext, productId: string) {
    if (!idSchema.safeParse(productId).success) {
      throw shopProductNotFound();
    }
    const locked = await tx.$queryRaw<
      { id: string; catalogue_product_id: string | null }[]
    >`SELECT id, catalogue_product_id FROM shop_products
      WHERE id = ${productId}::uuid AND shop_id = ${shop.shopId}::uuid
      FOR UPDATE`;
    const row = locked.at(0);
    if (!row) {
      throw shopProductNotFound();
    }
    const packCount = await tx.shopProductPack.count({
      where: { shopId: shop.shopId, shopProductId: row.id },
    });
    return {
      id: row.id,
      catalogueProductId: row.catalogue_product_id,
      packCount,
    };
  }

  private async loadPack(
    tx: Tx,
    shop: ShopContext,
    productId: string,
    packId: string,
  ) {
    const pack =
      idSchema.safeParse(productId).success &&
      idSchema.safeParse(packId).success
        ? await tx.shopProductPack.findFirst({
            where: {
              id: packId,
              shopId: shop.shopId,
              shopProductId: productId,
            },
            select: {
              id: true,
              shopProductId: true,
              mrpPaise: true,
              pricePaise: true,
              available: true,
            },
          })
        : null;
    if (!pack) {
      throw shopPackNotFound();
    }
    return pack;
  }

  /** The size columns of a new pack, checked against the product's kind. */
  private async packSize(
    tx: Tx,
    catalogueProductId: string | null,
    input: AddShopPackRequest,
  ): Promise<
    | { cataloguePackId: string }
    | { quantity: number; unit: NonNullable<AddShopPackRequest['unit']> }
  > {
    if (catalogueProductId !== null) {
      if (!input.cataloguePackId || input.quantity || input.unit) {
        throw problem(
          HttpStatus.BAD_REQUEST,
          'pack_kind_mismatch',
          "Choose one of the brand's pack sizes.",
          'cataloguePackId',
        );
      }
      await requirePacksOfProduct(tx, catalogueProductId, [
        input.cataloguePackId,
      ]);
      return { cataloguePackId: input.cataloguePackId };
    }
    if (input.cataloguePackId || !input.quantity || !input.unit) {
      throw problem(
        HttpStatus.BAD_REQUEST,
        'pack_kind_mismatch',
        'Enter the pack quantity and unit.',
        'quantity',
      );
    }
    return { quantity: input.quantity, unit: input.unit };
  }

  private async catalogueListingData(
    tx: Tx,
    shop: ShopContext,
    input: Extract<AddShopProductRequest, { source: 'catalogue' }>,
  ): Promise<Prisma.ShopProductUncheckedCreateInput> {
    const product = await tx.catalogueProduct.findFirst({
      where: {
        id: input.catalogueProductId,
        active: true,
        brand: { active: true },
        category: { active: true },
      },
      select: { id: true },
    });
    if (!product) {
      throw problem(
        HttpStatus.BAD_REQUEST,
        'catalogue_product_unavailable',
        'This product is not in the brand catalogue.',
        'catalogueProductId',
      );
    }
    const existing = await tx.shopProduct.findUnique({
      where: {
        shopId_catalogueProductId: {
          shopId: shop.shopId,
          catalogueProductId: product.id,
        },
      },
      select: { id: true },
    });
    if (existing) {
      throw alreadyListed();
    }
    await requirePacksOfProduct(
      tx,
      product.id,
      input.packs.map((pack) => pack.cataloguePackId),
    );
    return {
      shopId: shop.shopId,
      catalogueProductId: product.id,
      packs: {
        create: input.packs.map((pack) => ({
          cataloguePackId: pack.cataloguePackId,
          mrpPaise: pack.mrpPaise ?? null,
          pricePaise: pack.pricePaise,
          available: pack.available,
        })),
      },
    };
  }

  private async ownProductData(
    tx: Tx,
    shop: ShopContext,
    input: Extract<AddShopProductRequest, { source: 'own' }>,
  ): Promise<Prisma.ShopProductUncheckedCreateInput> {
    await requireActiveCategory(tx, input.categoryId);
    if (input.brandId) {
      await requireActiveBrand(tx, input.brandId);
    }
    return {
      shopId: shop.shopId,
      customName: normaliseText(input.name),
      customNameKey: nameKey(input.name),
      categoryId: input.categoryId,
      brandId: input.brandId ?? null,
      customBrandName: input.brandName ? normaliseText(input.brandName) : null,
      description: blankToNull(input.description),
      supportsShades: input.supportsShades,
      packs: {
        create: input.packs.map((pack) => ({
          quantity: pack.quantity,
          unit: pack.unit,
          mrpPaise: pack.mrpPaise ?? null,
          pricePaise: pack.pricePaise,
          available: pack.available,
        })),
      },
    };
  }

  private audit(
    tx: Tx,
    user: CurrentUserContext,
    shop: ShopContext,
    action: AuditAction,
    productId: string,
    metadata: Prisma.InputJsonObject,
  ) {
    return recordAuditEvent(tx, {
      actor: { type: 'USER', userId: user.id },
      action,
      entityType: 'shop_product',
      entityId: productId,
      shopId: shop.shopId,
      metadata,
    });
  }
}

async function requirePacksOfProduct(
  tx: Tx,
  catalogueProductId: string,
  packIds: readonly string[],
): Promise<void> {
  const found = await tx.cataloguePack.count({
    where: { id: { in: [...packIds] }, productId: catalogueProductId },
  });
  if (found !== new Set(packIds).size) {
    throw problem(
      HttpStatus.BAD_REQUEST,
      'pack_not_in_product',
      'Choose pack sizes of this product.',
      'packs',
    );
  }
}

async function requireActiveCategory(tx: Tx, categoryId: string) {
  const found = await tx.catalogueCategory.count({
    where: { id: categoryId, active: true },
  });
  if (found === 0) {
    throw problem(
      HttpStatus.BAD_REQUEST,
      'category_unavailable',
      'Choose one of the listed categories.',
      'categoryId',
    );
  }
}

async function requireActiveBrand(tx: Tx, brandId: string) {
  const found = await tx.brand.count({ where: { id: brandId, active: true } });
  if (found === 0) {
    throw problem(
      HttpStatus.BAD_REQUEST,
      'brand_unavailable',
      'Choose one of the listed brands, or type the brand name.',
      'brandId',
    );
  }
}

function alreadyListed() {
  return problem(
    HttpStatus.CONFLICT,
    'product_already_listed',
    'This product is already in your catalogue.',
  );
}

function ownProductExists(name: string) {
  return problem(
    HttpStatus.CONFLICT,
    'own_product_exists',
    `You already have a product named "${normaliseText(name)}".`,
    'name',
  );
}
