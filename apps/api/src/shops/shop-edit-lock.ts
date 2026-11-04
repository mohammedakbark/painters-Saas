import { HttpStatus } from '@nestjs/common';
import { ProblemException } from '../common/http/problem-details.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { ShopStatus } from '../generated/prisma/enums.js';
import { shopNotFound } from '../shop-access/shop-access.guard.js';

/**
 * D-033: while a shop waits for review, its profile, photo and location are
 * locked. Call inside the transaction of the change: the row lock makes a
 * concurrent review submission wait, so a change can't slip in after the
 * shop was submitted. Products are not locked (D-033).
 */
export async function lockShopForProfileEdit(
  tx: Prisma.TransactionClient,
  shopId: string,
): Promise<void> {
  if ((await lockShopStatus(tx, shopId)) === 'PENDING_REVIEW') {
    throw shopInReview();
  }
}

/**
 * Locks the shop row for the rest of the transaction and returns its status.
 * Status changes (submit, withdraw, decide) and profile edits all take this
 * lock, so they apply one after another.
 */
export async function lockShopStatus(
  tx: Prisma.TransactionClient,
  shopId: string,
): Promise<ShopStatus> {
  const rows = await tx.$queryRaw<{ status: ShopStatus }[]>`
    SELECT status FROM shops WHERE id = ${shopId}::uuid FOR UPDATE`;
  const row = rows.at(0);
  if (!row) {
    throw shopNotFound();
  }
  return row.status;
}

export function shopInReview(): ProblemException {
  return new ProblemException(HttpStatus.CONFLICT, {
    detail:
      'Your shop is in review, so its profile, photo and location are locked. Withdraw the submission to make changes.',
    code: 'shop_in_review',
  });
}
