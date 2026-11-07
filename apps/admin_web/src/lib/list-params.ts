/**
 * URL state of the data-table pages (CAT-006, PLT-003): read query values
 * safely and build links that keep the other filters and leave defaults out.
 */

export type SearchParams = Record<string, string | string[] | undefined>;

/** A trimmed, non-empty text value, or undefined. */
export const text = (value: string | string[] | undefined) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

/** One of the allowed values, or the fallback. */
export function oneOf<T extends string>(
  list: readonly T[],
  value: string | undefined,
  fallback: T,
): T {
  return (list as readonly string[]).includes(value ?? '')
    ? (value as T)
    : fallback;
}

/** Page number and page size from the URL (sizes 10, 25 or 50). */
export function readPaging(
  search: SearchParams,
  sizes: readonly number[] = [10, 25, 50],
  defaultSize = 25,
): { page: number; pageSize: number } {
  const page = Number(text(search.page));
  const pageSize = Number(text(search.pageSize));
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: sizes.includes(pageSize) ? pageSize : defaultSize,
  };
}

/** `base?…` with every value that differs from its default. */
export function listLink(
  base: string,
  values: Record<string, string | number | undefined>,
  defaults: Record<string, string>,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (
      value !== undefined &&
      value !== '' &&
      String(value) !== defaults[key]
    ) {
      query.set(key, String(value));
    }
  }
  const qs = query.toString();
  return qs ? `${base}?${qs}` : base;
}
