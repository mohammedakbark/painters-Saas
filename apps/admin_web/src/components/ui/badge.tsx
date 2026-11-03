import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning';

const TONES: Record<BadgeTone, string> = {
  neutral: 'border-border-strong text-text-secondary',
  info: 'border-status-info text-status-info',
  success: 'border-status-success text-status-success',
  warning: 'border-status-warning text-status-warning',
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
        'inline-flex items-center rounded-pill border bg-surface-default px-3 py-1 text-caption font-semibold',
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}
