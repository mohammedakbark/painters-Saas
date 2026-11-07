import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { decodeCursor, pageOf } from '../common/pagination/keyset-cursor.js';
import { ImageStore } from '../media/image-store.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { afterName, listShadePage } from './catalogue-admin.service.js';
import {
  BRAND_SELECT,
  CATEGORY_SELECT,
  notFound,
  PRODUCT_SELECT,
  toBrand,
  toCategory,
  toProduct,
} from './catalogue-mapping.js';
import type {
  BrandPage,
  BrandResponse,
  CatalogueListQuery,
  CategoryList,
  ProductListQuery,
  ProductPage,
  ProductResponse,
  ShadePage,
} from './catalogue.schemas.js';

const idSchema = z.uuid();

/**
 * The shared catalogue as shops (and later customers) see it: only active
 * brands, categories, products and shades. Archived entries stay readable by
 * platform admins through the management API.
 */
@Injectable()
export class CatalogueReadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly images: ImageStore,
  ) {}

  async categories(): Promise<CategoryList> {
    const rows = await this.prisma.catalogueCategory.findMany({
      where: { active: true, shopId: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: CATEGORY_SELECT,
    });
    return { items: rows.map(toCategory) };
  }

  async brands(query: CatalogueListQuery): Promise<BrandPage> {
    const after = query.cursor ? decodeCursor(query.cursor) : undefined;
    const rows = await this.prisma.brand.findMany({
      where: {
        active: true,
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

  async brand(brandId: string): Promise<BrandResponse> {
    return toBrand(await this.requireActiveBrand(brandId));
  }

  /** A brand's products, or (CAT-005) a search across every active brand. */
  async products(
    brandId: string | undefined,
    query: ProductListQuery,
  ): Promise<ProductPage> {
    if (brandId) {
      await this.requireActiveBrand(brandId);
    }
    const after = query.cursor ? decodeCursor(query.cursor) : undefined;
    const rows = await this.prisma.catalogueProduct.findMany({
      where: {
        ...(brandId ? { brandId } : { brand: { active: true } }),
        active: true,
        category: { active: true },
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

  async product(productId: string): Promise<ProductResponse> {
    const row = idSchema.safeParse(productId).success
      ? await this.prisma.catalogueProduct.findFirst({
          where: {
            id: productId,
            active: true,
            brand: { active: true },
            category: { active: true },
          },
          select: PRODUCT_SELECT,
        })
      : null;
    if (!row) {
      throw notFound('product');
    }
    return toProduct(row, this.images);
  }

  async shades(brandId: string, query: CatalogueListQuery): Promise<ShadePage> {
    await this.requireActiveBrand(brandId);
    return listShadePage(this.prisma, brandId, query, true);
  }

  private async requireActiveBrand(brandId: string) {
    const row = idSchema.safeParse(brandId).success
      ? await this.prisma.brand.findFirst({
          where: { id: brandId, active: true },
          select: BRAND_SELECT,
        })
      : null;
    if (!row) {
      throw notFound('brand');
    }
    return row;
  }
}
