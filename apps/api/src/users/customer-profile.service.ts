import { HttpStatus, Injectable } from '@nestjs/common';
import { AuditAction, recordAuditEvent } from '../audit/audit.js';
import type { CurrentUserContext } from '../auth/current-user.js';
import { ProblemException } from '../common/http/problem-details.js';
import type { CustomerType } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CustomerProfileResponse,
  UpdateCustomerProfileRequest,
} from './customer-profile.schemas.js';

const PROFILE_SELECT = {
  displayName: true,
  phone: true,
  customerType: true,
} as const;

/**
 * The caller's own Customer App profile (CUS-001). Every read and write is
 * keyed by the verified caller; there is no user id in the request, so one
 * person can never read or change another's profile.
 */
@Injectable()
export class CustomerProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async get(user: CurrentUserContext): Promise<CustomerProfileResponse> {
    const row = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: PROFILE_SELECT,
    });
    return toResponse(row);
  }

  /** Sets the name and the customer type (D-036), with an audit event. */
  async update(
    user: CurrentUserContext,
    input: UpdateCustomerProfileRequest,
  ): Promise<CustomerProfileResponse> {
    if (user.phone === null) {
      throw new ProblemException(HttpStatus.FORBIDDEN, {
        detail: 'Sign in with your mobile number to use the Customer App.',
        code: 'phone_verification_required',
      });
    }
    const row = await this.prisma.$transaction(async (tx) => {
      const before = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
        select: PROFILE_SELECT,
      });
      const updated = await tx.user.update({
        where: { id: user.id },
        data: {
          displayName: input.displayName,
          customerType: input.customerType,
        },
        select: PROFILE_SELECT,
      });
      const fields = [
        ...(before.displayName === updated.displayName ? [] : ['displayName']),
        ...(before.customerType === updated.customerType
          ? []
          : ['customerType']),
      ];
      if (fields.length > 0) {
        await recordAuditEvent(tx, {
          actor: { type: 'USER', userId: user.id },
          action: AuditAction.CustomerProfileUpdated,
          entityType: 'user',
          entityId: user.id,
          // The type is not sensitive; the name itself is never logged.
          metadata: { fields, customerType: updated.customerType },
        });
      }
      return updated;
    });
    return toResponse(row);
  }
}

function toResponse(row: {
  displayName: string | null;
  phone: string | null;
  customerType: CustomerType | null;
}): CustomerProfileResponse {
  return {
    displayName: row.displayName,
    phone: row.phone,
    customerType: row.customerType,
    complete:
      row.customerType !== null &&
      row.displayName !== null &&
      row.displayName.trim() !== '',
  };
}
