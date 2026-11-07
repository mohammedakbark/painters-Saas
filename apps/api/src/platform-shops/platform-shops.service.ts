import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { Prisma } from '../generated/prisma/client.js';
import { ImageStore } from '../media/image-store.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { shopNotFound } from '../shop-access/shop-access.guard.js';
import type {
  ShopRegistryEntry,
  ShopRegistryPage,
  ShopRegistryQuery,
} from './platform-shops.schemas.js';

/**
 * Registration facts only. Private shop business data (catalogue, customers,
 * orders, credit, bills) must never be added to this select.
 */
const REGISTRY_SELECT = {
  id: true,
  name: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  photoKey: true,
  photoUpdatedAt: true,
  memberships: {
    where: { role: 'MASTER' },
    take: 1,
    select: { user: { select: { displayName: true, phone: true } } },
  },
} as const;

type RegistryRow = {
  id: string;
  name: string;
  status: ShopRegistryEntry['status'];
  createdAt: Date;
  updatedAt: Date;
  photoKey: string | null;
  photoUpdatedAt: Date | null;
  memberships: { user: { displayName: string | null; phone: string | null } }[];
};

const shopIdSchema = z.uuid();

/** Read-only shop registry for platform admins (PLT-001). */
@Injectable()
export class PlatformShopsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly images: ImageStore,
  ) {}

  /**
   * Registered shops (PLT-003): search, a status filter, sort and numbered
   * pages, with counts per status for the tabs. Paged in the database.
   */
  async list(query: ShopRegistryQuery): Promise<ShopRegistryPage> {
    const search: Prisma.ShopWhereInput = query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' } },
            {
              memberships: {
                some: {
                  role: 'MASTER',
                  user: {
                    OR: [
                      {
                        displayName: { contains: query.q, mode: 'insensitive' },
                      },
                      { phone: { contains: query.q.replace(/[\s+-]/g, '') } },
                    ],
                  },
                },
              },
            },
          ],
        }
      : {};
    const where: Prisma.ShopWhereInput = {
      ...search,
      ...(query.status ? { status: query.status } : {}),
    };
    const orderBy: Prisma.ShopOrderByWithRelationInput[] =
      query.sort === 'name'
        ? [{ name: 'asc' }, { id: 'asc' }]
        : [{ id: query.sort === 'oldest' ? 'asc' : 'desc' }];
    const [rows, total, grouped] = await Promise.all([
      this.prisma.shop.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: REGISTRY_SELECT,
      }),
      this.prisma.shop.count({ where }),
      this.prisma.shop.groupBy({
        by: ['status'],
        where: search,
        _count: { _all: true },
      }),
    ]);
    const statusCounts = {
      ALL: 0,
      DRAFT: 0,
      PENDING_REVIEW: 0,
      CHANGES_REQUESTED: 0,
      ACTIVE: 0,
    };
    for (const group of grouped) {
      statusCounts[group.status] = group._count._all;
      statusCounts.ALL += group._count._all;
    }
    return {
      items: rows.map((row) => toEntry(row, this.images)),
      total,
      page: query.page,
      pageSize: query.pageSize,
      statusCounts,
    };
  }

  async get(shopId: string): Promise<ShopRegistryEntry> {
    if (!shopIdSchema.safeParse(shopId).success) {
      throw shopNotFound();
    }
    const row = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: REGISTRY_SELECT,
    });
    if (!row) {
      throw shopNotFound();
    }
    return toEntry(row, this.images);
  }
}

function toEntry(row: RegistryRow, images: ImageStore): ShopRegistryEntry {
  const master = row.memberships[0]?.user;
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    photoThumbUrl:
      images.urls(row.photoKey, row.photoUpdatedAt)?.thumbUrl ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    master: master ? { name: master.displayName, phone: master.phone } : null,
  };
}
