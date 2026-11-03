import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type AlertTone = 'error' | 'success' | 'info';

const TONES: Record<AlertTone, { label: string; border: string }> = {
  error: { label: 'Error', border: 'border-status-error' },
  success: { label: 'Success', border: 'border-status-success' },
  info: { label: 'Information', border: 'border-status-info' },
};

/**
 * Inline message. Errors are announced immediately (role="alert"); other tones
 * politely (role="status"). The tone is also stated in text, never only by colour.
 */
export function Alert({
  tone,
  title,
  children,
}: {
  tone: AlertTone;
  title?: string;
  children: ReactNode;
}) {
  const { label, border } = TONES[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-medium border border-l-4 border-border-default bg-surface-default px-4 py-3 text-body text-text-primary',
        border,
      )}
    >
      <p className="font-semibold">{title ?? label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
