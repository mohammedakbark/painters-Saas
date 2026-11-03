import type { Prisma } from '../generated/prisma/client.js';

/** Audited actions. Add new actions here so names stay consistent. */
export const AuditAction = {
  PlatformAdminGranted: 'platform_admin.granted',
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export type AuditActor =
  | { type: 'USER'; userId: string }
  /** Operator scripts and other non-user actors. */
  | { type: 'SYSTEM' };

export interface AuditEventInput {
  actor: AuditActor;
  action: AuditAction;
  entityType: string;
  entityId: string;
  /** Owning shop for tenant-scoped events. */
  shopId?: string;
  /**
   * Context for reviewers. Never put passwords, tokens, OTPs, phone numbers,
   * identity documents or other sensitive values here.
   */
  metadata?: Prisma.InputJsonObject;
}

/** Minimal client surface needed to write audit events (a transaction client). */
export type AuditWriter = Pick<Prisma.TransactionClient, 'auditEvent'>;

/**
 * Appends an audit event. Pass the transaction client of the change being
 * audited so the event commits or rolls back together with it.
 */
export async function recordAuditEvent(
  writer: AuditWriter,
  event: AuditEventInput,
): Promise<void> {
  await writer.auditEvent.create({
    data: {
      actorType: event.actor.type,
      actorUserId: event.actor.type === 'USER' ? event.actor.userId : null,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      shopId: event.shopId ?? null,
      ...(event.metadata === undefined ? {} : { metadata: event.metadata }),
    },
  });
}
