import { Injectable } from '@nestjs/common';
import { AuditAction, recordAuditEvent } from '../audit/audit.js';
import type { CurrentUserContext } from '../auth/current-user.js';
import { parseIndianMobile } from '../common/phone/indian-mobile.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  type ShopContext,
  shopNotFound,
} from '../shop-access/shop-access.guard.js';
import {
  PROFILE_MANAGER_ROLES,
  requireShopRole,
} from '../shop-access/shop-roles.js';
import { indianStateName } from './indian-states.js';
import { ImageStore } from '../media/image-store.js';
import type {
  ShopLocationInput,
  ShopOnboardingResponse,
  ShopProfileResponse,
  UpdateShopProfileRequest,
} from './shop-profile.schemas.js';

const PROFILE_SELECT = {
  id: true,
  name: true,
  status: true,
  supportPhone: true,
  addressLine1: true,
  addressLine2: true,
  landmark: true,
  city: true,
  district: true,
  stateCode: true,
  postalCode: true,
  latitude: true,
  longitude: true,
  locationSource: true,
  locationUpdatedAt: true,
  profileUpdatedAt: true,
  photoKey: true,
  photoUpdatedAt: true,
} as const satisfies Prisma.ShopSelect;

type ProfileRow = Prisma.ShopGetPayload<{ select: typeof PROFILE_SELECT }>;

/** Profile fields reported (by name only) in the audit trail. */
type ProfileField = 'supportPhone' | 'address' | 'location';

@Injectable()
export class ShopProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly images: ImageStore,
  ) {}

  async get(shop: ShopContext): Promise<ShopProfileResponse> {
    return this.toProfile(await this.load(shop.shopId));
  }

  /**
   * Replaces the support mobile and address (null clears them) and, when
   * given, the location. Audits the names of the fields that changed, never
   * their values.
   */
  async update(
    user: CurrentUserContext,
    shop: ShopContext,
    input: UpdateShopProfileRequest,
  ): Promise<ShopProfileResponse> {
    requireShopRole(shop, PROFILE_MANAGER_ROLES);
    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const before = await tx.shop.findUnique({
        where: { id: shop.shopId },
        select: PROFILE_SELECT,
      });
      if (!before) {
        throw shopNotFound();
      }

      const data: Prisma.ShopUpdateInput = {
        supportPhone:
          input.supportPhone === null
            ? null
            : parseIndianMobile(input.supportPhone),
        ...addressData(input.address),
        ...(input.location ? locationData(input.location, now) : {}),
      };
      const after = await tx.shop.update({
        where: { id: shop.shopId },
        data: { ...data, profileUpdatedAt: now },
        select: PROFILE_SELECT,
      });

      const changed = changedFields(before, after);
      if (changed.length > 0) {
        await recordAuditEvent(tx, {
          actor: { type: 'USER', userId: user.id },
          action: AuditAction.ShopProfileUpdated,
          entityType: 'shop',
          entityId: shop.shopId,
          shopId: shop.shopId,
          metadata: { fields: changed },
        });
      }
      return after;
    });

    return this.toProfile(updated);
  }

  /** Sets only the map location (the Shop App's "Use my current location"). */
  async updateLocation(
    user: CurrentUserContext,
    shop: ShopContext,
    input: ShopLocationInput,
  ): Promise<ShopProfileResponse> {
    requireShopRole(shop, PROFILE_MANAGER_ROLES);
    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const after = await tx.shop.update({
        where: { id: shop.shopId },
        data: { ...locationData(input, now), profileUpdatedAt: now },
        select: PROFILE_SELECT,
      });
      await recordAuditEvent(tx, {
        actor: { type: 'USER', userId: user.id },
        action: AuditAction.ShopLocationUpdated,
        entityType: 'shop',
        entityId: shop.shopId,
        shopId: shop.shopId,
        // The source only: coordinates are not copied into the audit trail.
        metadata: { source: input.source },
      });
      return after;
    });

    return this.toProfile(updated);
  }

  /**
   * The onboarding checklist (D-012). Computed here so every client shows the
   * same rule. CAT-002 adds the products.
   */
  async onboarding(shop: ShopContext): Promise<ShopOnboardingResponse> {
    const row = await this.load(shop.shopId);
    return {
      items: [
        { key: 'address', done: row.addressLine1 !== null },
        { key: 'location', done: row.latitude !== null },
        { key: 'support_phone', done: row.supportPhone !== null },
        { key: 'photo', done: row.photoKey !== null },
      ],
    };
  }

  private toProfile(row: ProfileRow): ShopProfileResponse {
    return {
      shopId: row.id,
      shopName: row.name,
      status: row.status,
      supportPhone: row.supportPhone,
      address: toAddress(row),
      location: toLocation(row),
      photo: this.images.urls(row.photoKey, row.photoUpdatedAt),
      updatedAt: row.profileUpdatedAt?.toISOString() ?? null,
    };
  }

  private async load(shopId: string): Promise<ProfileRow> {
    const row = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: PROFILE_SELECT,
    });
    if (!row) {
      throw shopNotFound();
    }
    return row;
  }
}

function blankToNull(value: string | null | undefined): string | null {
  return value === undefined || value === null || value === '' ? null : value;
}

function addressData(
  address: UpdateShopProfileRequest['address'],
): Prisma.ShopUpdateInput {
  if (address === null) {
    return {
      addressLine1: null,
      addressLine2: null,
      landmark: null,
      city: null,
      district: null,
      stateCode: null,
      postalCode: null,
    };
  }
  return {
    addressLine1: address.line1,
    addressLine2: blankToNull(address.line2),
    landmark: blankToNull(address.landmark),
    city: address.city,
    district: address.district,
    stateCode: address.stateCode,
    postalCode: address.postalCode,
  };
}

/** Coordinates are stored with 6 decimals (about 0.1 m). */
function locationData(
  location: ShopLocationInput,
  now: Date,
): Prisma.ShopUpdateInput {
  return {
    latitude: new Prisma.Decimal(location.latitude.toFixed(6)),
    longitude: new Prisma.Decimal(location.longitude.toFixed(6)),
    locationSource: location.source,
    locationUpdatedAt: now,
  };
}

function changedFields(before: ProfileRow, after: ProfileRow): ProfileField[] {
  const changed: ProfileField[] = [];
  if (before.supportPhone !== after.supportPhone) {
    changed.push('supportPhone');
  }
  const addressKeys = [
    'addressLine1',
    'addressLine2',
    'landmark',
    'city',
    'district',
    'stateCode',
    'postalCode',
  ] as const;
  if (addressKeys.some((key) => before[key] !== after[key])) {
    changed.push('address');
  }
  if (
    before.locationUpdatedAt?.getTime() !== after.locationUpdatedAt?.getTime()
  ) {
    changed.push('location');
  }
  return changed;
}

function toAddress(row: ProfileRow): ShopProfileResponse['address'] {
  const { addressLine1: line1, city, district, stateCode, postalCode } = row;
  if (
    line1 === null ||
    city === null ||
    district === null ||
    stateCode === null ||
    postalCode === null
  ) {
    return null;
  }
  return {
    line1,
    line2: row.addressLine2,
    landmark: row.landmark,
    city,
    district,
    stateCode,
    stateName: indianStateName(stateCode),
    postalCode,
  };
}

function toLocation(row: ProfileRow): ShopProfileResponse['location'] {
  const { latitude, longitude, locationSource, locationUpdatedAt } = row;
  if (
    latitude === null ||
    longitude === null ||
    locationSource === null ||
    locationUpdatedAt === null
  ) {
    return null;
  }
  return {
    latitude: latitude.toNumber(),
    longitude: longitude.toNumber(),
    source: locationSource,
    updatedAt: locationUpdatedAt.toISOString(),
  };
}
