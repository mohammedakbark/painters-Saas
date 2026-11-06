import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning';

// Filled soft background, text and dot in the tone colour (CAT-003): each
// state has its own colour, so opposite states never look alike.
const TONES: Record<BadgeTone, { badge: string; dot: string }> = {
  neutral: {
    badge: 'bg-surface-subtle text-text-secondary',
    dot: 'bg-text-secondary',
  },
  info: {
    badge: 'bg-status-info-soft text-status-info',
    dot: 'bg-status-info',
  },
  success: {
    badge: 'bg-status-success-soft text-status-success',
    dot: 'bg-status-success',
  },
  warning: {
    badge: 'bg-status-warning-soft text-status-warning',
    dot: 'bg-status-warning',
  },
};

/** Short status label. The text carries the meaning; colour only supports it. */
export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-badge px-3 py-1 text-caption font-semibold whitespace-nowrap',
        TONES[tone].badge,
      )}
    >
      <span
        aria-hidden="true"
        className={cn('size-1.5 shrink-0 rounded-badge', TONES[tone].dot)}
      />
      {children}
    </span>
  );
}
