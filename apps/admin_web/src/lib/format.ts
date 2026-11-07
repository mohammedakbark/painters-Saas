// Initial market: Kerala (D-020). Dates are shown in Indian Standard Time.
const DATE_TIME = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Kolkata',
});

const DATE = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeZone: 'Asia/Kolkata',
});

/** "3 Nov 2026, 4:05 pm" (IST) for an ISO timestamp. */
export function formatDateTime(iso: string): string {
  return DATE_TIME.format(new Date(iso));
}

/** "3 Nov 2026" (IST) for an ISO timestamp. */
export function formatDate(iso: string): string {
  return DATE.format(new Date(iso));
}

/** "1 product", "12 products". */
export function countLabel(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** Whole days since an ISO time (0 on the same day), e.g. a review's wait. */
export function daysSince(iso: string, now: number = Date.now()): number {
  return Math.max(0, Math.floor((now - Date.parse(iso)) / 86_400_000));
}
