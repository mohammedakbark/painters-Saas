import { Injectable } from '@nestjs/common';
import { z } from 'zod';
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
  memberships: { user: { displayName: string | null; phone: string | null } }[];
};

const shopIdSchema = z.uuid();

/** Read-only shop registry for platform admins (PLT-001). */
@Injectable()
export class PlatformShopsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Newest first. Keyset pagination on the UUIDv7 id (time-ordered). */
  async list(query: ShopRegistryQuery): Promise<ShopRegistryPage> {
    const rows = await this.prisma.shop.findMany({
      where: query.cursor ? { id: { lt: query.cursor } } : undefined,
      orderBy: { id: 'desc' },
      take: query.limit + 1,
      select: REGISTRY_SELECT,
    });
    const page = rows.slice(0, query.limit);
    const hasMore = rows.length > query.limit;
    return {
      items: page.map(toEntry),
      nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
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
    return toEntry(row);
  }
}

function toEntry(row: RegistryRow): ShopRegistryEntry {
  const master = row.memberships[0]?.user;
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    master: master ? { name: master.displayName, phone: master.phone } : null,
  };
}
