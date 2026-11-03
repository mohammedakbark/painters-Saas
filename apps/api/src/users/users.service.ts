import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import type { VerifiedIdentity } from '../auth/access-token-verifier.js';
import type { CurrentUserContext } from '../auth/current-user.js';
import { ProblemException } from '../common/http/problem-details.js';
import type { PlatformRole } from '../generated/prisma/enums.js';
import { isUniqueViolation } from '../prisma/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';

const USER_CONTEXT_SELECT = {
  id: true,
  authSubject: true,
  email: true,
  phone: true,
  displayName: true,
  platformAdmin: { select: { role: true } },
} as const;

interface UserContextRow {
  id: string;
  authSubject: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  platformAdmin: { role: PlatformRole } | null;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the local user for a verified identity, creating the row on the
   * first authenticated request (just-in-time provisioning). Concurrent first
   * requests are safe: the loser of the insert race re-reads the winner's row.
   */
  async resolve(identity: VerifiedIdentity): Promise<CurrentUserContext> {
    const existing = await this.findBySubject(identity.subject);
    if (existing) {
      return existing;
    }

    try {
      const created = await this.prisma.user.create({
        data: {
          authSubject: identity.subject,
          email: identity.email,
          phone: identity.phone,
        },
        select: USER_CONTEXT_SELECT,
      });
      return toContext(created);
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      const raced = await this.findBySubject(identity.subject);
      if (raced) {
        return raced;
      }
      // The email or phone already belongs to a different local user. Linking
      // them automatically could hand one person's account to another.
      this.logger.warn(
        `Identity conflict creating a user for subject ${identity.subject}.`,
      );
      throw new ProblemException(HttpStatus.CONFLICT, {
        detail:
          'This account conflicts with an existing user. Contact platform support.',
        code: 'identity_conflict',
      });
    }
  }

  private async findBySubject(
    authSubject: string,
  ): Promise<CurrentUserContext | null> {
    const row = await this.prisma.user.findUnique({
      where: { authSubject },
      select: USER_CONTEXT_SELECT,
    });
    return row ? toContext(row) : null;
  }
}

function toContext(row: UserContextRow): CurrentUserContext {
  return {
    id: row.id,
    authSubject: row.authSubject,
    email: row.email,
    phone: row.phone,
    displayName: row.displayName,
    platformRole: row.platformAdmin?.role ?? null,
  };
}
