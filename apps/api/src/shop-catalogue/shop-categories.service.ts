import { HttpStatus, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AuditAction, recordAuditEvent } from '../audit/audit.js';
import type { CurrentUserContext } from '../auth/current-user.js';
import { nameKey, normaliseText } from '../catalogue/catalogue-text.js';
import type { Prisma } from '../generated/prisma/client.js';
import { isUniqueViolation } from '../prisma/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ShopContext } from '../shop-access/shop-access.guard.js';
import {
  CATALOGUE_MANAGER_ROLES,
  requireShopRole,
} from '../shop-access/shop-roles.js';
import {
  type CreateShopCategoryRequest,
  MAX_SHOP_CATEGORIES,
  type ShopCategoryList,
  type ShopCategoryResponse,
  type UpdateShopCategoryRequest,
} from './shop-categories.schemas.js';
import { problem } from './shop-catalogue-mapping.js';

type Tx = Prisma.TransactionClient;

const idSchema = z.uuid();

const categoryNotFound = () =>
  problem(
    HttpStatus.NOT_FOUND,
    'shop_category_not_found',
    'Category not found.',
  );

const nameTaken = (name: string) =>
  problem(
    HttpStatus.CONFLICT,
    'category_name_taken',
    `There is already a category named "${name}".`,
    'name',
  );

/**
 * A shop's own product categories next to the platform's (CAT-007, D-048).
 * Own categories live in `catalogue_categories` with the shop's id; only that
 * shop sees or uses them. Members read; the owner adds, renames and archives.
 */
@Injectable()
export class ShopCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Active platform categories and all of the shop's own (archived ones too,
   * so they can be restored), with how many of the shop's products use each.
   */
  async list(shop: ShopContext): Promise<ShopCategoryList> {
    const rows = await this.prisma.catalogueCategory.findMany({
      where: {
        OR: [{ shopId: null, active: true }, { shopId: shop.shopId }],
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        sortOrder: true,
        active: true,
        shopId: true,
        _count: {
          select: { shopProducts: { where: { shopId: shop.shopId } } },
        },
      },
    });
    return {
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        sortOrder: row.sortOrder,
        active: row.active,
        own: row.shopId !== null,
        productCount: row._count.shopProducts,
      })),
    };
  }

  async create(
    user: CurrentUserContext,
    shop: ShopContext,
    input: CreateShopCategoryRequest,
  ): Promise<ShopCategoryResponse> {
    requireShopRole(shop, CATALOGUE_MANAGER_ROLES);
    const name = normaliseText(input.name);
    return this.write(name, async (tx) => {
      const count = await tx.catalogueCategory.count({
        where: { shopId: shop.shopId },
      });
      if (count >= MAX_SHOP_CATEGORIES) {
        throw problem(
          HttpStatus.CONFLICT,
          'shop_category_limit',
          `A shop can have at most ${MAX_SHOP_CATEGORIES} categories of its own.`,
        );
      }
      await requireFreeName(tx, shop.shopId, name);
      const row = await tx.catalogueCategory.create({
        data: {
          name,
          nameKey: nameKey(name),
          shopId: shop.shopId,
          // After the platform's categories, which use 0 to 999.
          sortOrder: 1000,
        },
        select: { id: true, name: true, sortOrder: true, active: true },
      });
      await recordAuditEvent(tx, {
        actor: { type: 'USER', userId: user.id },
        action: AuditAction.ShopCategoryCreated,
        entityType: 'catalogue_category',
        entityId: row.id,
        shopId: shop.shopId,
      });
      return { ...row, own: true, productCount: 0 };
    });
  }

  async update(
    user: CurrentUserContext,
    shop: ShopContext,
    categoryId: string,
    input: UpdateShopCategoryRequest,
  ): Promise<ShopCategoryResponse> {
    requireShopRole(shop, CATALOGUE_MANAGER_ROLES);
    const name =
      input.name === undefined ? undefined : normaliseText(input.name);
    return this.write(name ?? '', async (tx) => {
      // Only this shop's own categories; platform ones and other shops'
      // categories are "not found".
      const current = idSchema.safeParse(categoryId).success
        ? await tx.catalogueCategory.findFirst({
            where: { id: categoryId, shopId: shop.shopId },
            select: { id: true },
          })
        : null;
      if (!current) {
        throw categoryNotFound();
      }
      if (name !== undefined) {
        await requireFreeName(tx, shop.shopId, name, categoryId);
      }
      const row = await tx.catalogueCategory.update({
        where: { id: categoryId },
        data: {
          ...(name === undefined ? {} : { name, nameKey: nameKey(name) }),
          active: input.active,
        },
        select: {
          id: true,
          name: true,
          sortOrder: true,
          active: true,
          _count: {
            select: { shopProducts: { where: { shopId: shop.shopId } } },
          },
        },
      });
      await recordAuditEvent(tx, {
        actor: { type: 'USER', userId: user.id },
        action: AuditAction.ShopCategoryUpdated,
        entityType: 'catalogue_category',
        entityId: row.id,
        shopId: shop.shopId,
        metadata: {
          fields: [
            ...(name === undefined ? [] : ['name']),
            ...(input.active === undefined ? [] : ['active']),
          ],
        },
      });
      return {
        id: row.id,
        name: row.name,
        sortOrder: row.sortOrder,
        active: row.active,
        own: true,
        productCount: row._count.shopProducts,
      };
    });
  }

  /** Runs a write; a concurrent duplicate name becomes `category_name_taken`. */
  private async write<T>(name: string, work: (tx: Tx) => Promise<T>) {
    try {
      return await this.prisma.$transaction(work);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw nameTaken(name);
      }
      throw error;
    }
  }
}

/** A shop category can't repeat a platform category or another own one. */
async function requireFreeName(
  tx: Tx,
  shopId: string,
  name: string,
  exceptId?: string,
) {
  const taken = await tx.catalogueCategory.count({
    where: {
      nameKey: nameKey(name),
      OR: [{ shopId: null }, { shopId }],
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
  });
  if (taken > 0) {
    throw nameTaken(name);
  }
}
