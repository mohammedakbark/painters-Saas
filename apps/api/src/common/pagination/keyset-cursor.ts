import { HttpStatus } from '@nestjs/common';
import { ProblemException } from '../http/problem-details.js';

/**
 * Opaque cursors for keyset pagination on a sort value plus the id, for
 * example `(name, id)` (ADR 0006). The cursor is base64url JSON; clients pass
 * back the `nextCursor` they received and never build one.
 */
export function encodeCursor(sortValue: string, id: string): string {
  return Buffer.from(JSON.stringify([sortValue, id]), 'utf8').toString(
    'base64url',
  );
}

export interface DecodedCursor {
  sortValue: string;
  id: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Throws 400 `invalid_cursor` for anything this API did not issue. */
export function decodeCursor(cursor: string): DecodedCursor {
  try {
    const value: unknown = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    );
    if (
      Array.isArray(value) &&
      value.length === 2 &&
      typeof value[0] === 'string' &&
      typeof value[1] === 'string' &&
      UUID.test(value[1])
    ) {
      return { sortValue: value[0], id: value[1] };
    }
  } catch {
    // Falls through to the problem below.
  }
  throw new ProblemException(HttpStatus.BAD_REQUEST, {
    detail: 'cursor must be the nextCursor of a previous page.',
    code: 'invalid_cursor',
  });
}

/** Splits `limit + 1` rows into a page and the next cursor. */
export function pageOf<T extends { id: string }>(
  rows: readonly T[],
  limit: number,
  sortValue: (row: T) => string,
): { items: T[]; nextCursor: string | null } {
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  return {
    items,
    nextCursor:
      rows.length > limit && last
        ? encodeCursor(sortValue(last), last.id)
        : null,
  };
}
