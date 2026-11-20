import { HttpStatus, Injectable } from '@nestjs/common';
import type { CurrentUserContext } from '../auth/current-user.js';
import { ProblemException } from '../common/http/problem-details.js';
import type { Prisma } from '../generated/prisma/client.js';
import { ImageStore } from '../media/image-store.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  FindShopsPage,
  FindShopsQuery,
  MyShopsList,
  NearQuery,
  PublicShop,
  ShopDistricts,
} from './shop-discovery.schemas.js';

/** Only Live shops can be found, opened or added (D-037). */
const LIVE: Prisma.ShopWhereInput = { status: 'ACTIVE' };

const PUBLIC_SHOP_SELECT = {
  id: true,
  name: true,
  photoKey: true,
  photoUpdatedAt: true,
  addressLine1: true,
  addressLine2: true,
  landmark: true,
  city: true,
  district: true,
  stateCode: true,
  postalCode: true,
  latitude: true,
  longitude: true,
  deliveryEnabled: true,
  deliveryChargePaise: true,
  freeDeliveryAbovePaise: true,
  deliveryRadiusKm: true,
} as const satisfies Prisma.ShopSelect;

type PublicShopRow = Prisma.ShopGetPayload<{
  select: typeof PUBLIC_SHOP_SELECT;
}>;

interface Position {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_KM = 6371;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Great-circle distance in km (haversine). */
export function distanceKm(a: Position, b: Position): number {
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function positionOf(query: NearQuery): Position | null {
  return query.lat === undefined || query.lng === undefined
    ? null
    : { latitude: query.lat, longitude: query.lng };
}

function sameDistrict(a: string | null, b: string): boolean {
  return a !== null && a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Finding Live shops and the caller's private My Shops list (CUS-002,
 * D-037, D-038). The caller's position is used only to sort and is never
 * stored. Nothing here reads or reveals a shop's private data.
 */
@Injectable()
export class ShopDiscoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly images: ImageStore,
  ) {}

  /**
   * Every Live shop: nearest first with a position, the chosen district
   * first without one, otherwise by name. No distance cut-off (D-038).
   */
  async find(
    user: CurrentUserContext,
    query: FindShopsQuery,
  ): Promise<FindShopsPage> {
    const position = positionOf(query);
    const where: Prisma.ShopWhereInput = {
      ...LIVE,
      ...(query.q ? { name: { contains: query.q, mode: 'insensitive' } } : {}),
    };
    // Few shops per region: order the light rows in memory, then load the page.
    const candidates = await this.prisma.shop.findMany({
      where,
      select: {
        id: true,
        name: true,
        district: true,
        latitude: true,
        longitude: true,
      },
    });
    const sort = position ? 'distance' : query.district ? 'district' : 'name';
    const byName = (a: { name: string }, b: { name: string }) =>
      a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
    const ranked = candidates
      .map((shop) => ({
        ...shop,
        distance:
          position && shop.latitude !== null && shop.longitude !== null
            ? distanceKm(position, {
                latitude: shop.latitude.toNumber(),
                longitude: shop.longitude.toNumber(),
              })
            : null,
      }))
      .sort((a, b) => {
        if (sort === 'distance') {
          if (a.distance === null || b.distance === null) {
            return a.distance === b.distance
              ? byName(a, b)
              : a.distance === null
                ? 1
                : -1;
          }
          return a.distance - b.distance || byName(a, b);
        }
        if (sort === 'district' && query.district) {
          const inA = sameDistrict(a.district, query.district);
          const inB = sameDistrict(b.district, query.district);
          if (inA !== inB) return inA ? -1 : 1;
        }
        return byName(a, b);
      });

    const start = (query.page - 1) * query.pageSize;
    const pageIds = ranked
      .slice(start, start + query.pageSize)
      .map((shop) => shop.id);
    const rows = await this.load(pageIds);
    const saved = await this.savedAmong(user.id, pageIds);
    return {
      items: pageIds.flatMap((id) => {
        const row = rows.get(id);
        return row ? [this.toPublic(row, position, saved.has(id))] : [];
      }),
      total: ranked.length,
      page: query.page,
      pageSize: query.pageSize,
      sort,
    };
  }

  /** The districts that have Live shops, for the picker when location is off. */
  async districts(): Promise<ShopDistricts> {
    const groups = await this.prisma.shop.groupBy({
      by: ['district', 'stateCode'],
      where: { ...LIVE, district: { not: null } },
      _count: { _all: true },
    });
    return {
      items: groups
        .flatMap((group) =>
          group.district === null
            ? []
            : [
                {
                  district: group.district,
                  stateCode: group.stateCode,
                  shopCount: group._count._all,
                },
              ],
        )
        .sort((a, b) =>
          a.district.localeCompare(b.district, 'en', { sensitivity: 'base' }),
        ),
    };
  }

  /** One Live shop. Any signed-in person may open it without adding it (D-037). */
  async get(
    user: CurrentUserContext,
    shopId: string,
    query: NearQuery,
  ): Promise<PublicShop> {
    const row = await this.liveShop(shopId);
    const saved = await this.savedAmong(user.id, [shopId]);
    return this.toPublic(row, positionOf(query), saved.has(shopId));
  }

  /** The caller's My Shops, most recently added first; Live shops only. */
  async myShops(
    user: CurrentUserContext,
    query: NearQuery,
  ): Promise<MyShopsList> {
    const links = await this.prisma.customerShop.findMany({
      where: { userId: user.id, shop: LIVE },
      orderBy: { createdAt: 'desc' },
      select: { shop: { select: PUBLIC_SHOP_SELECT } },
    });
    const position = positionOf(query);
    return {
      items: links.map((link) => this.toPublic(link.shop, position, true)),
    };
  }

  /** Adds a Live shop to My Shops, instantly and without approval (D-037). */
  async add(user: CurrentUserContext, shopId: string): Promise<PublicShop> {
    const row = await this.liveShop(shopId);
    await this.prisma.customerShop.upsert({
      where: { userId_shopId: { userId: user.id, shopId } },
      create: { userId: user.id, shopId },
      update: {},
    });
    return this.toPublic(row, null, true);
  }

  /** Removes a shop from the caller's My Shops. Removing twice is fine. */
  async remove(user: CurrentUserContext, shopId: string): Promise<void> {
    await this.prisma.customerShop.deleteMany({
      where: { userId: user.id, shopId },
    });
  }

  private async liveShop(shopId: string): Promise<PublicShopRow> {
    const row = !UUID.test(shopId)
      ? null
      : await this.prisma.shop.findFirst({
          where: { ...LIVE, id: shopId },
          select: PUBLIC_SHOP_SELECT,
        });
    if (!row) {
      // Draft and in-review shops are not found, so their existence is not revealed.
      throw new ProblemException(HttpStatus.NOT_FOUND, {
        detail: 'This shop was not found.',
        code: 'shop_not_found',
      });
    }
    return row;
  }

  private async load(ids: string[]): Promise<Map<string, PublicShopRow>> {
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.shop.findMany({
      where: { ...LIVE, id: { in: ids } },
      select: PUBLIC_SHOP_SELECT,
    });
    return new Map(rows.map((row) => [row.id, row]));
  }

  private async savedAmong(
    userId: string,
    ids: string[],
  ): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const links = await this.prisma.customerShop.findMany({
      where: { userId, shopId: { in: ids } },
      select: { shopId: true },
    });
    return new Set(links.map((link) => link.shopId));
  }

  private toPublic(
    row: PublicShopRow,
    position: Position | null,
    inMyShops: boolean,
  ): PublicShop {
    const location =
      row.latitude === null || row.longitude === null
        ? null
        : {
            latitude: row.latitude.toNumber(),
            longitude: row.longitude.toNumber(),
          };
    return {
      id: row.id,
      name: row.name,
      photo: this.images.urls(row.photoKey, row.photoUpdatedAt),
      address: {
        line1: row.addressLine1,
        line2: row.addressLine2,
        landmark: row.landmark,
        city: row.city,
        district: row.district,
        stateCode: row.stateCode,
        postalCode: row.postalCode,
      },
      location,
      delivery: row.deliveryEnabled
        ? {
            enabled: true,
            chargePaise: row.deliveryChargePaise,
            freeAbovePaise: row.freeDeliveryAbovePaise,
            radiusKm: row.deliveryRadiusKm,
          }
        : {
            enabled: false,
            chargePaise: null,
            freeAbovePaise: null,
            radiusKm: null,
          },
      distanceKm:
        position && location
          ? Math.round(distanceKm(position, location) * 10) / 10
          : null,
      inMyShops,
    };
  }
}
