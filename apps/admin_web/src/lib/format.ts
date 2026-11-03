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
