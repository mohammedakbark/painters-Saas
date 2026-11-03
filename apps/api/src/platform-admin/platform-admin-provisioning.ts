import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { AuditAction, recordAuditEvent } from '../audit/audit.js';
import {
  IdentityAdmin,
  IdentityConflictError,
  IdentityRejectedError,
} from '../identity/identity-admin.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type ProvisionOutcome = 'created' | 'granted_existing' | 'already_admin';

/** A problem the operator can fix. The message is safe to print. */
export class ProvisioningError extends Error {
  override readonly name = 'ProvisioningError';
}

/** bcrypt, used by Supabase Auth, ignores bytes beyond 72. */
const MAX_PASSWORD_LENGTH = 72;
const MIN_PASSWORD_LENGTH = 12;

/** Returns the password-policy problems; empty when the password is acceptable. */
export function passwordProblems(password: string): string[] {
  const problems: string[] = [];
  if (password.length < MIN_PASSWORD_LENGTH) {
    problems.push(`at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    problems.push(`at most ${MAX_PASSWORD_LENGTH} characters`);
  }
  if (!/[a-z]/.test(password)) {
    problems.push('a lower-case letter');
  }
  if (!/[A-Z]/.test(password)) {
    problems.push('an upper-case letter');
  }
  if (!/\d/.test(password)) {
    problems.push('a digit');
  }
  return problems;
}

const emailSchema = z.email();

/**
 * Creates platform admins for the operator script
 * (`pnpm --filter api platform-admin:create`). There is no HTTP route for this.
 */
@Injectable()
export class PlatformAdminProvisioning {
  private readonly logger = new Logger(PlatformAdminProvisioning.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly identity: IdentityAdmin,
  ) {}

  /**
   * Makes `rawEmail` a platform admin. `readPassword` is called only when a new
   * identity-provider account has to be created.
   */
  async provision(
    rawEmail: string,
    readPassword: () => Promise<string>,
  ): Promise<ProvisionOutcome> {
    const parsedEmail = emailSchema.safeParse(rawEmail.trim().toLowerCase());
    if (!parsedEmail.success) {
      throw new ProvisioningError('Enter a valid email address.');
    }
    const email = parsedEmail.data;

    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, platformAdmin: { select: { role: true } } },
    });
    if (existing?.platformAdmin) {
      return 'already_admin';
    }
    if (existing) {
      await this.grant(existing.id, 'existing_user');
      return 'granted_existing';
    }

    const password = await readPassword();
    const problems = passwordProblems(password);
    if (problems.length > 0) {
      throw new ProvisioningError(`The password needs ${problems.join(', ')}.`);
    }

    const subject = await this.createIdentity(email, password);
    try {
      await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { authSubject: subject, email },
          select: { id: true },
        });
        await tx.platformAdmin.create({
          data: { userId: user.id, role: 'SUPER_ADMIN' },
        });
        await recordAuditEvent(tx, {
          actor: { type: 'SYSTEM' },
          action: AuditAction.PlatformAdminGranted,
          entityType: 'user',
          entityId: user.id,
          metadata: { role: 'SUPER_ADMIN', source: 'operator_script' },
        });
      });
    } catch (error) {
      await this.rollBackIdentity(subject);
      throw error;
    }
    return 'created';
  }

  private async grant(userId: string, source: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.platformAdmin.create({
        data: { userId, role: 'SUPER_ADMIN' },
      });
      await recordAuditEvent(tx, {
        actor: { type: 'SYSTEM' },
        action: AuditAction.PlatformAdminGranted,
        entityType: 'user',
        entityId: userId,
        metadata: { role: 'SUPER_ADMIN', source: `operator_script:${source}` },
      });
    });
  }

  private async createIdentity(
    email: string,
    password: string,
  ): Promise<string> {
    try {
      const { subject } = await this.identity.createEmailUser({
        email,
        password,
      });
      return subject;
    } catch (error) {
      if (error instanceof IdentityConflictError) {
        throw new ProvisioningError(
          'An Auth account with this email already exists but is not linked to a ' +
            'local user. Sign in with it once (any API call creates the link), then ' +
            're-run this command.',
        );
      }
      if (error instanceof IdentityRejectedError) {
        throw new ProvisioningError(
          `Supabase Auth rejected the account (${error.code}).`,
        );
      }
      throw error;
    }
  }

  private async rollBackIdentity(subject: string): Promise<void> {
    try {
      await this.identity.deleteUser(subject);
    } catch {
      this.logger.error(
        `Could not remove Auth user ${subject} after a failed database write; ` +
          'delete it manually before retrying.',
      );
    }
  }
}
