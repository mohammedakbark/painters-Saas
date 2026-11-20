import { HttpStatus, Injectable } from '@nestjs/common';
import { AuditAction, recordAuditEvent } from '../audit/audit.js';
import type { CurrentUserContext } from '../auth/current-user.js';
import { ProblemException } from '../common/http/problem-details.js';
import type { Prisma } from '../generated/prisma/client.js';
import { isUniqueViolation } from '../prisma/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  type CreateCustomerSiteRequest,
  type CustomerSite,
  type CustomerSiteList,
  type CustomerSiteListQuery,
  MAX_ACTIVE_SITES,
  type UpdateCustomerSiteRequest,
} from './customer-sites.schemas.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SITE_SELECT = {
  id: true,
  name: true,
  ownerName: true,
  address: true,
  latitude: true,
  longitude: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.CustomerSiteSelect;

type SiteRow = Prisma.CustomerSiteGetPayload<{ select: typeof SITE_SELECT }>;

function toSite(row: SiteRow): CustomerSite {
  return {
    id: row.id,
    name: row.name,
    ownerName: row.ownerName,
    address: row.address,
    pin: {
      latitude: row.latitude.toNumber(),
      longitude: row.longitude.toNumber(),
    },
    archived: row.archivedAt !== null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const painterOnly = () =>
  new ProblemException(HttpStatus.FORBIDDEN, {
    detail:
      'Sites are for painters. Choose Painter/Contractor in your profile first.',
    code: 'painter_only',
  });

const siteNotFound = () =>
  new ProblemException(HttpStatus.NOT_FOUND, {
    detail: 'This site was not found.',
    code: 'site_not_found',
  });

const nameTaken = () =>
  new ProblemException(HttpStatus.CONFLICT, {
    detail: 'You already have a site with this name.',
    code: 'site_name_taken',
    errors: [
      { path: 'name', message: 'You already have a site with this name.' },
    ],
  });

/**
 * A painter's own work sites (CUS-005, D-049). Every query is keyed by the
 * verified caller, so one person never sees another's sites. Painters only
 * (D-036). Sites are archived and restored, never deleted (owner,
 * 2026-11-20). Audit events hold field names, never the address or pin.
 */
@Injectable()
export class CustomerSitesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    user: CurrentUserContext,
    query: CustomerSiteListQuery,
  ): Promise<CustomerSiteList> {
    await this.requirePainter(user);
    const rows = await this.prisma.customerSite.findMany({
      where: {
        userId: user.id,
        archivedAt: query.archived ? { not: null } : null,
      },
      orderBy: query.archived ? { archivedAt: 'desc' } : { name: 'asc' },
      select: SITE_SELECT,
    });
    return { items: rows.map(toSite) };
  }

  async get(user: CurrentUserContext, siteId: string): Promise<CustomerSite> {
    await this.requirePainter(user);
    return toSite(await this.own(this.prisma, user, siteId));
  }

  async create(
    user: CurrentUserContext,
    input: CreateCustomerSiteRequest,
  ): Promise<CustomerSite> {
    await this.requirePainter(user);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const active = await tx.customerSite.count({
          where: { userId: user.id, archivedAt: null },
        });
        if (active >= MAX_ACTIVE_SITES) {
          throw new ProblemException(HttpStatus.CONFLICT, {
            detail: `You can have up to ${MAX_ACTIVE_SITES} sites. Archive finished sites first.`,
            code: 'site_limit_reached',
          });
        }
        const row = await tx.customerSite.create({
          data: {
            userId: user.id,
            name: input.name,
            ownerName: input.ownerName ?? null,
            address: input.address,
            latitude: input.pin.latitude,
            longitude: input.pin.longitude,
          },
          select: SITE_SELECT,
        });
        await recordAuditEvent(tx, {
          actor: { type: 'USER', userId: user.id },
          action: AuditAction.CustomerSiteCreated,
          entityType: 'customer_site',
          entityId: row.id,
        });
        return toSite(row);
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw nameTaken();
      throw error;
    }
  }

  async update(
    user: CurrentUserContext,
    siteId: string,
    input: UpdateCustomerSiteRequest,
  ): Promise<CustomerSite> {
    await this.requirePainter(user);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const current = await this.own(tx, user, siteId);
        if (current.archivedAt !== null) {
          throw new ProblemException(HttpStatus.CONFLICT, {
            detail: 'Restore this site before changing it.',
            code: 'site_archived',
          });
        }
        const row = await tx.customerSite.update({
          where: { id: siteId },
          data: {
            ...(input.name === undefined ? {} : { name: input.name }),
            ...(input.ownerName === undefined
              ? {}
              : { ownerName: input.ownerName }),
            ...(input.address === undefined ? {} : { address: input.address }),
            ...(input.pin === undefined
              ? {}
              : {
                  latitude: input.pin.latitude,
                  longitude: input.pin.longitude,
                }),
          },
          select: SITE_SELECT,
        });
        await recordAuditEvent(tx, {
          actor: { type: 'USER', userId: user.id },
          action: AuditAction.CustomerSiteUpdated,
          entityType: 'customer_site',
          entityId: siteId,
          metadata: {
            fields: Object.keys(input).filter(
              (key) => input[key as keyof typeof input] !== undefined,
            ),
          },
        });
        return toSite(row);
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw nameTaken();
      throw error;
    }
  }

  /** Archives (true) or restores (false) a site. Repeating is fine. */
  async setArchived(
    user: CurrentUserContext,
    siteId: string,
    archived: boolean,
  ): Promise<CustomerSite> {
    await this.requirePainter(user);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const current = await this.own(tx, user, siteId);
        if ((current.archivedAt !== null) === archived) return toSite(current);
        if (!archived) {
          const active = await tx.customerSite.count({
            where: { userId: user.id, archivedAt: null },
          });
          if (active >= MAX_ACTIVE_SITES) {
            throw new ProblemException(HttpStatus.CONFLICT, {
              detail: `You can have up to ${MAX_ACTIVE_SITES} sites. Archive finished sites first.`,
              code: 'site_limit_reached',
            });
          }
        }
        const row = await tx.customerSite.update({
          where: { id: siteId },
          data: { archivedAt: archived ? new Date() : null },
          select: SITE_SELECT,
        });
        await recordAuditEvent(tx, {
          actor: { type: 'USER', userId: user.id },
          action: archived
            ? AuditAction.CustomerSiteArchived
            : AuditAction.CustomerSiteRestored,
          entityType: 'customer_site',
          entityId: siteId,
        });
        return toSite(row);
      });
    } catch (error) {
      // Restoring next to an active site with the same name.
      if (isUniqueViolation(error)) throw nameTaken();
      throw error;
    }
  }

  private async requirePainter(user: CurrentUserContext): Promise<void> {
    const row = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { customerType: true },
    });
    if (row?.customerType !== 'PAINTER') throw painterOnly();
  }

  private async own(
    client: Pick<Prisma.TransactionClient, 'customerSite'>,
    user: CurrentUserContext,
    siteId: string,
  ): Promise<SiteRow> {
    const row = UUID.test(siteId)
      ? await client.customerSite.findFirst({
          where: { id: siteId, userId: user.id },
          select: SITE_SELECT,
        })
      : null;
    if (!row) throw siteNotFound();
    return row;
  }
}
