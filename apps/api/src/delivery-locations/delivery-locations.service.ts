import { HttpStatus, Injectable } from '@nestjs/common';
import { AuditAction, recordAuditEvent } from '../audit/audit.js';
import type { CurrentUserContext } from '../auth/current-user.js';
import { ProblemException } from '../common/http/problem-details.js';
import type { Prisma } from '../generated/prisma/client.js';
import { isUniqueViolation } from '../prisma/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  type CreateDeliveryLocationRequest,
  type DeliveryLocation,
  type DeliveryLocationList,
  MAX_ACTIVE_LOCATIONS,
  type UpdateDeliveryLocationRequest,
} from './delivery-locations.schemas.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SELECT = {
  id: true,
  label: true,
  address: true,
  latitude: true,
  longitude: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.CustomerDeliveryLocationSelect;

type Row = Prisma.CustomerDeliveryLocationGetPayload<{
  select: typeof SELECT;
}>;

function toLocation(row: Row): DeliveryLocation {
  return {
    id: row.id,
    label: row.label,
    address: row.address,
    pin: {
      latitude: row.latitude.toNumber(),
      longitude: row.longitude.toNumber(),
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const locationNotFound = () =>
  new ProblemException(HttpStatus.NOT_FOUND, {
    detail: 'This delivery place was not found.',
    code: 'delivery_location_not_found',
  });

const labelTaken = () =>
  new ProblemException(HttpStatus.CONFLICT, {
    detail: 'You already have a place with this name.',
    code: 'delivery_location_label_taken',
    errors: [
      { path: 'label', message: 'You already have a place with this name.' },
    ],
  });

/**
 * A person's saved delivery places (CUS-006, D-049, D-061). Every query is
 * keyed by the verified caller. Archived, never deleted, so past orders keep
 * their snapshot. Audit events hold field names, never the address or pin.
 */
@Injectable()
export class DeliveryLocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: CurrentUserContext): Promise<DeliveryLocationList> {
    const rows = await this.prisma.customerDeliveryLocation.findMany({
      where: { userId: user.id, archivedAt: null },
      orderBy: { label: 'asc' },
      select: SELECT,
    });
    return { items: rows.map(toLocation) };
  }

  async create(
    user: CurrentUserContext,
    input: CreateDeliveryLocationRequest,
  ): Promise<DeliveryLocation> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const active = await tx.customerDeliveryLocation.count({
          where: { userId: user.id, archivedAt: null },
        });
        if (active >= MAX_ACTIVE_LOCATIONS) {
          throw new ProblemException(HttpStatus.CONFLICT, {
            detail: `You can save up to ${MAX_ACTIVE_LOCATIONS} places. Remove one first.`,
            code: 'delivery_location_limit_reached',
          });
        }
        const row = await tx.customerDeliveryLocation.create({
          data: {
            userId: user.id,
            label: input.label,
            address: input.address,
            latitude: input.pin.latitude,
            longitude: input.pin.longitude,
          },
          select: SELECT,
        });
        await recordAuditEvent(tx, {
          actor: { type: 'USER', userId: user.id },
          action: AuditAction.DeliveryLocationCreated,
          entityType: 'delivery_location',
          entityId: row.id,
        });
        return toLocation(row);
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw labelTaken();
      throw error;
    }
  }

  async update(
    user: CurrentUserContext,
    locationId: string,
    input: UpdateDeliveryLocationRequest,
  ): Promise<DeliveryLocation> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.activeOwn(tx, user, locationId);
        const row = await tx.customerDeliveryLocation.update({
          where: { id: locationId },
          data: {
            ...(input.label === undefined ? {} : { label: input.label }),
            ...(input.address === undefined ? {} : { address: input.address }),
            ...(input.pin === undefined
              ? {}
              : {
                  latitude: input.pin.latitude,
                  longitude: input.pin.longitude,
                }),
          },
          select: SELECT,
        });
        await recordAuditEvent(tx, {
          actor: { type: 'USER', userId: user.id },
          action: AuditAction.DeliveryLocationUpdated,
          entityType: 'delivery_location',
          entityId: locationId,
          metadata: {
            fields: Object.keys(input).filter(
              (key) => input[key as keyof typeof input] !== undefined,
            ),
          },
        });
        return toLocation(row);
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw labelTaken();
      throw error;
    }
  }

  /** Removes the place from the list; past orders keep their copy. */
  async archive(user: CurrentUserContext, locationId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.activeOwn(tx, user, locationId);
      await tx.customerDeliveryLocation.update({
        where: { id: locationId },
        data: { archivedAt: new Date() },
      });
      await recordAuditEvent(tx, {
        actor: { type: 'USER', userId: user.id },
        action: AuditAction.DeliveryLocationArchived,
        entityType: 'delivery_location',
        entityId: locationId,
      });
    });
  }

  /** The caller's active place, for checkout. Throws 404 otherwise. */
  async activeOwn(
    client: Pick<Prisma.TransactionClient, 'customerDeliveryLocation'>,
    user: CurrentUserContext,
    locationId: string,
  ): Promise<Row> {
    const row = UUID.test(locationId)
      ? await client.customerDeliveryLocation.findFirst({
          where: { id: locationId, userId: user.id, archivedAt: null },
          select: SELECT,
        })
      : null;
    if (!row) throw locationNotFound();
    return row;
  }
}
