import { HttpStatus, Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  AuditAction,
  changedFields as changed,
  recordAuditEvent,
} from '../audit/audit.js';
import type { CurrentUserContext } from '../auth/current-user.js';
import { ProblemException } from '../common/http/problem-details.js';
import { decodeCursor, pageOf } from '../common/pagination/keyset-cursor.js';
import { Prisma } from '../generated/prisma/client.js';
import { ImageStore } from '../media/image-store.js';
import { isUniqueViolation } from '../prisma/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  alreadyExists,
  BRAND_SELECT,
  CATEGORY_SELECT,
  notFound,
  PRODUCT_SELECT,
  SHADE_SELECT,
  toBrand,
  toCategory,
  toProduct,
  toShade,
} from './catalogue-mapping.js';
import type {
  BrandPage,
  BrandResponse,
  CatalogueListQuery,
  Category,
  CategoryList,
  CreateBrandRequest,
  CreateCategoryRequest,
  CreateProductRequest,
  CreateShadeRequest,
  PackInput,
  ProductListQuery,
  ProductPage,
  ProductResponse,
  ShadePage,
  ShadeResponse,
  UpdateBrandRequest,
  UpdateCategoryRequest,
  UpdateProductRequest,
  UpdateShadeRequest,
} from './catalogue.schemas.js';
import {
  blankToNull,
  nameKey,
  normaliseHex,
  normaliseShadeCode,
  normaliseText,
  packKey,
} from './catalogue-text.js';

const idSchema = z.uuid();
type Tx = Prisma.TransactionClient;

/** Platform-admin management of the shared brand catalogue (CAT-001, D-030). */
@Injectable()
export class CatalogueAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly images: ImageStore,
  ) {}

  // --- Categories ------------------------------------------------------------

  async listCategories(): Promise<CategoryList> {
    const rows = await this.prisma.catalogueCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: CATEGORY_SELECT,
    });
    return { items: rows.map(toCategory) };
  }

  async createCategory(
    user: CurrentUserContext,
    input: CreateCategoryRequest,
  ): Promise<Category> {
    const name = normaliseText(input.name);
    return this.write(
      'category',
      `A category named "${name}" already exists.`,
      async (tx) => {
        const row = await tx.catalogueCategory.create({
          data: {
            name,
            nameKey: nameKey(name),
            sortOrder: input.sortOrder ?? 0,
          },
          select: CATEGORY_SELECT,
        });
        await this.audit(
          tx,
          user,
          AuditAction.CatalogueCategoryCreated,
          'catalogue_category',
          row.id,
        );
        return toCategory(row);
      },
    );
  }

  async updateCategory(
    user: CurrentUserContext,
    categoryId: string,
    input: UpdateCategoryRequest,
  ): Promise<Category> {
    const name =
      input.name === undefined ? undefined : normaliseText(input.name);
    return this.write(
      'category',
      `A category named "${name}" already exists.`,
      async (tx) => {
        await this.requireCategory(tx, categoryId);
        const row = await tx.catalogueCategory.update({
          where: { id: categoryId },
          data: {
            ...(name === undefined ? {} : { name, nameKey: nameKey(name) }),
            sortOrder: input.sortOrder,
            active: input.active,
          },
          select: CATEGORY_SELECT,
        });
        await this.audit(
          tx,
          user,
          AuditAction.CatalogueCategoryUpdated,
          'catalogue_category',
          row.id,
          changed(input),
        );
        return toCategory(row);
      },
    );
  }

  // --- Brands ----------------------------------------------------------------

  /** All brands (including archived), by name. */
  async listBrands(query: CatalogueListQuery): Promise<BrandPage> {
    const after = query.cursor ? decodeCursor(query.cursor) : undefined;
    const rows = await this.prisma.brand.findMany({
      where: {
        ...(query.q
          ? { name: { contains: query.q, mode: 'insensitive' } }
          : {}),
        ...(after ? afterName(after) : {}),
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: query.limit + 1,
      select: BRAND_SELECT,
    });
    const page = pageOf(rows, query.limit, (row) => row.name);
    return { items: page.items.map(toBrand), nextCursor: page.nextCursor };
  }

  async getBrand(brandId: string): Promise<BrandResponse> {
    return toBrand(await this.requireBrand(this.prisma, brandId));
  }

  async createBrand(
    user: CurrentUserContext,
    input: CreateBrandRequest,
  ): Promise<BrandResponse> {
    const name = normaliseText(input.name);
    return this.write(
      'brand',
      `A brand named "${name}" already exists.`,
      async (tx) => {
        const row = await tx.brand.create({
          data: { name, nameKey: nameKey(name) },
          select: BRAND_SELECT,
        });
        await this.audit(tx, user, AuditAction.BrandCreated, 'brand', row.id);
        return toBrand(row);
      },
    );
  }

  async updateBrand(
    user: CurrentUserContext,
    brandId: string,
    input: UpdateBrandRequest,
  ): Promise<BrandResponse> {
    const name =
      input.name === undefined ? undefined : normaliseText(input.name);
    return this.write(
      'brand',
      `A brand named "${name}" already exists.`,
      async (tx) => {
        await this.requireBrand(tx, brandId);
        const row = await tx.brand.update({
          where: { id: brandId },
          data: {
            ...(name === undefined ? {} : { name, nameKey: nameKey(name) }),
            active: input.active,
          },
          select: BRAND_SELECT,
        });
        await this.audit(
          tx,
          user,
          AuditAction.BrandUpdated,
          'brand',
          row.id,
          changed(input),
        );
        return toBrand(row);
      },
    );
  }

  // --- Products --------------------------------------------------------------

  /** A brand's products (including archived), by name. */
  async listProducts(
    brandId: string,
    query: ProductListQuery,
  ): Promise<ProductPage> {
    await this.requireBrand(this.prisma, brandId);
    const after = query.cursor ? decodeCursor(query.cursor) : undefined;
    const rows = await this.prisma.catalogueProduct.findMany({
      where: {
        brandId,
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query.q
          ? { name: { contains: query.q, mode: 'insensitive' } }
          : {}),
        ...(after ? afterName(after) : {}),
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: query.limit + 1,
      select: PRODUCT_SELECT,
    });
    const page = pageOf(rows, query.limit, (row) => row.name);
    return {
      items: page.items.map((row) => toProduct(row, this.images)),
      nextCursor: page.nextCursor,
    };
  }

  async getProduct(productId: string): Promise<ProductResponse> {
    return toProduct(
      await this.requireProduct(this.prisma, productId),
      this.images,
    );
  }

  async createProduct(
    user: CurrentUserContext,
    brandId: string,
    input: CreateProductRequest,
  ): Promise<ProductResponse> {
    const name = normaliseText(input.name);
    return this.write(
      'product',
      `This brand already has a product named "${name}".`,
      async (tx) => {
        await this.requireBrand(tx, brandId);
        await this.requireActiveCategory(tx, input.categoryId);
        const row = await tx.catalogueProduct.create({
          data: {
            brandId,
            categoryId: input.categoryId,
            name,
            nameKey: nameKey(name),
            description: blankToNull(input.description),
            supportsShades: input.supportsShades,
            packs: { create: input.packs.map(packData) },
          },
          select: PRODUCT_SELECT,
        });
        await this.audit(
          tx,
          user,
          AuditAction.CatalogueProductCreated,
          'catalogue_product',
          row.id,
        );
        return toProduct(row, this.images);
      },
    );
  }

  async updateProduct(
    user: CurrentUserContext,
    productId: string,
    input: UpdateProductRequest,
  ): Promise<ProductResponse> {
    const name =
      input.name === undefined ? undefined : normaliseText(input.name);
    return this.write(
      'product',
      `This brand already has a product named "${name}".`,
      async (tx) => {
        const current = await this.requireProduct(tx, productId);
        if (
          input.categoryId !== undefined &&
          input.categoryId !== current.category.id
        ) {
          await this.requireActiveCategory(tx, input.categoryId);
        }
        if (input.packs) {
          await this.replacePacks(tx, productId, current.packs, input.packs);
        }
        const row = await tx.catalogueProduct.update({
          where: { id: productId },
          data: {
            ...(name === undefined ? {} : { name, nameKey: nameKey(name) }),
            categoryId: input.categoryId,
            description:
              input.description === undefined
                ? undefined
                : blankToNull(input.description),
            supportsShades: input.supportsShades,
            active: input.active,
          },
          select: PRODUCT_SELECT,
        });
        await this.audit(
          tx,
          user,
          AuditAction.CatalogueProductUpdated,
          'catalogue_product',
          row.id,
          changed(input),
        );
        return toProduct(row, this.images);
      },
    );
  }

  /** Replaces the product image (same pipeline as shop photos, ADR 0007). */
  async replaceProductImage(
    user: CurrentUserContext,
    productId: string,
    buffer: Buffer | undefined,
  ): Promise<ProductResponse> {
    await this.requireProduct(this.prisma, productId);
    const image = await this.images.store(
      `catalogue/products/${productId}/image`,
      buffer,
      'image',
    );
    let previous: string | null;
    let result: ProductResponse;
    try {
      [previous, result] = await this.prisma.$transaction(async (tx) => {
        const before = await this.requireProduct(tx, productId);
        const row = await tx.catalogueProduct.update({
          where: { id: productId },
          data: { imageKey: image.key, imageUpdatedAt: new Date() },
          select: PRODUCT_SELECT,
        });
        await this.audit(
          tx,
          user,
          AuditAction.CatalogueProductImageUpdated,
          'catalogue_product',
          productId,
          {
            replaced: before.imageKey !== null,
            width: image.width,
            height: image.height,
          },
        );
        return [before.imageKey, toProduct(row, this.images)] as const;
      });
    } catch (error) {
      await this.images.deleteQuietly(image.key);
      throw error;
    }
    await this.images.deleteQuietly(previous);
    return result;
  }

  // --- Shades ----------------------------------------------------------------

  /** A brand's shades (including archived), by code. */
  async listShades(
    brandId: string,
    query: CatalogueListQuery,
  ): Promise<ShadePage> {
    await this.requireBrand(this.prisma, brandId);
    return listShadePage(this.prisma, brandId, query, false);
  }

  async createShade(
    user: CurrentUserContext,
    brandId: string,
    input: CreateShadeRequest,
  ): Promise<ShadeResponse> {
    const code = normaliseShadeCode(input.code);
    return this.write(
      'shade',
      `This brand already has a shade with code ${code}.`,
      async (tx) => {
        await this.requireBrand(tx, brandId);
        const row = await tx.shade.create({
          data: {
            brandId,
            code,
            name: normaliseText(input.name),
            previewHex: input.previewHex
              ? normaliseHex(input.previewHex)
              : null,
          },
          select: SHADE_SELECT,
        });
        await this.audit(tx, user, AuditAction.ShadeCreated, 'shade', row.id);
        return toShade(row);
      },
    );
  }

  async updateShade(
    user: CurrentUserContext,
    shadeId: string,
    input: UpdateShadeRequest,
  ): Promise<ShadeResponse> {
    const code =
      input.code === undefined ? undefined : normaliseShadeCode(input.code);
    return this.write(
      'shade',
      `This brand already has a shade with code ${code}.`,
      async (tx) => {
        await this.requireShade(tx, shadeId);
        const row = await tx.shade.update({
          where: { id: shadeId },
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
            active: input.active,
          },
          select: SHADE_SELECT,
        });
        await this.audit(
          tx,
          user,
          AuditAction.ShadeUpdated,
          'shade',
          row.id,
          changed(input),
        );
        return toShade(row);
      },
    );
  }

  // --- Helpers ---------------------------------------------------------------

  /** Runs a write transaction, turning a unique-constraint clash into 409. */
  private async write<T>(
    entity: 'brand' | 'category' | 'product' | 'shade',
    duplicateDetail: string,
    work: (tx: Tx) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(work);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw alreadyExists(entity, duplicateDetail);
      }
      throw error;
    }
  }

  private async replacePacks(
    tx: Tx,
    productId: string,
    current: readonly {
      id: string;
      quantity: Prisma.Decimal;
      unit: PackInput['unit'];
    }[],
    wanted: readonly PackInput[],
  ): Promise<void> {
    const wantedKeys = new Set(wanted.map(packKey));
    const currentKeys = new Set(
      current.map((pack) =>
        packKey({ quantity: pack.quantity.toNumber(), unit: pack.unit }),
      ),
    );
    const removed = current.filter(
      (pack) =>
        !wantedKeys.has(
          packKey({ quantity: pack.quantity.toNumber(), unit: pack.unit }),
        ),
    );
    if (removed.length > 0) {
      try {
        await tx.cataloguePack.deleteMany({
          where: { id: { in: removed.map((pack) => pack.id) } },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === 'P2003' || error.code === 'P2014')
        ) {
          throw new ProblemException(HttpStatus.CONFLICT, {
            detail: 'A pack size that shops have listed cannot be removed.',
            code: 'pack_in_use',
          });
        }
        throw error;
      }
    }
    const added = wanted.filter((pack) => !currentKeys.has(packKey(pack)));
    if (added.length > 0) {
      await tx.cataloguePack.createMany({
        data: added.map((pack) => ({ productId, ...packData(pack) })),
      });
    }
  }

  private async requireBrand(db: Tx | PrismaService, brandId: string) {
    const row = idSchema.safeParse(brandId).success
      ? await db.brand.findUnique({
          where: { id: brandId },
          select: BRAND_SELECT,
        })
      : null;
    if (!row) {
      throw notFound('brand');
    }
    return row;
  }

  private async requireCategory(db: Tx, categoryId: string) {
    const row = idSchema.safeParse(categoryId).success
      ? await db.catalogueCategory.findUnique({
          where: { id: categoryId },
          select: CATEGORY_SELECT,
        })
      : null;
    if (!row) {
      throw notFound('category');
    }
    return row;
  }

  private async requireActiveCategory(db: Tx, categoryId: string) {
    const category = await this.requireCategory(db, categoryId);
    if (!category.active) {
      throw new ProblemException(HttpStatus.CONFLICT, {
        detail: 'This category is archived. Choose another category.',
        code: 'category_archived',
      });
    }
    return category;
  }

  private async requireProduct(db: Tx | PrismaService, productId: string) {
    const row = idSchema.safeParse(productId).success
      ? await db.catalogueProduct.findUnique({
          where: { id: productId },
          select: PRODUCT_SELECT,
        })
      : null;
    if (!row) {
      throw notFound('product');
    }
    return row;
  }

  private async requireShade(db: Tx, shadeId: string) {
    const row = idSchema.safeParse(shadeId).success
      ? await db.shade.findUnique({
          where: { id: shadeId },
          select: SHADE_SELECT,
        })
      : null;
    if (!row) {
      throw notFound('shade');
    }
    return row;
  }

  private audit(
    tx: Tx,
    user: CurrentUserContext,
    action: AuditAction,
    entityType: string,
    entityId: string,
    metadata?: Prisma.InputJsonObject,
  ): Promise<void> {
    return recordAuditEvent(tx, {
      actor: { type: 'USER', userId: user.id },
      action,
      entityType,
      entityId,
      ...(metadata ? { metadata } : {}),
    });
  }
}

/** Shades of a brand by code; `activeOnly` for the shops' read API. */
export async function listShadePage(
  db: PrismaService,
  brandId: string,
  query: CatalogueListQuery,
  activeOnly: boolean,
): Promise<ShadePage> {
  const after = query.cursor ? decodeCursor(query.cursor) : undefined;
  const rows = await db.shade.findMany({
    where: {
      brandId,
      ...(activeOnly ? { active: true } : {}),
      // AND: the search and the cursor are both OR conditions.
      AND: [
        query.q
          ? {
              OR: [
                { code: { contains: query.q, mode: 'insensitive' } },
                { name: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {},
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
    select: SHADE_SELECT,
  });
  const page = pageOf(rows, query.limit, (row) => row.code);
  return { items: page.items.map(toShade), nextCursor: page.nextCursor };
}

/** Keyset condition for `ORDER BY name, id`. */
export function afterName(after: { sortValue: string; id: string }) {
  return {
    OR: [
      { name: { gt: after.sortValue } },
      { name: after.sortValue, id: { gt: after.id } },
    ],
  };
}

function packData(pack: PackInput) {
  return {
    quantity: new Prisma.Decimal(pack.quantity.toFixed(3)),
    unit: pack.unit,
  };
}
