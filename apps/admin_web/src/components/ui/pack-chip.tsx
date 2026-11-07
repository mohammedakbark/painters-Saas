import { cn } from '@/lib/cn';

/**
 * One pack size in a list row (CAT-006): "4 L · ₹1,950" with a dot that is
 * green when available and amber when not. Screen readers hear the state.
 */
export function PackChip({
  label,
  price,
  available,
}: {
  label: string;
  /** Formatted price, e.g. "₹1,950". */
  price: string;
  available: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-badge border px-2.5 py-1 text-caption whitespace-nowrap',
        available
          ? 'border-border-default bg-surface-default text-text-primary'
          : 'border-status-warning/40 bg-status-warning-soft text-status-warning',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-1.5 shrink-0 rounded-badge',
          available ? 'bg-status-success' : 'bg-status-warning',
        )}
      />
      <span className="font-semibold">{label}</span>
      <span aria-hidden="true">·</span>
      <span className="tabular-nums">{price}</span>
      {available ? null : <span className="sr-only">, not available</span>}
    </span>
  );
}
