import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { UrlForm, UrlFormStatus } from './url-form';

/**
 * The GET form behind `ColumnFilter`s (CAT-003). Empty filters are left out
 * of the URL, so links stay short ("?available=false", not "?q=&brand=…").
 * Filters apply through the client router (PERF-001): the list stays on
 * screen with an "Updating…" note until the new rows arrive.
 */
export function FilterForm({
  id,
  action,
  className,
  children,
}: {
  id: string;
  action: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <UrlForm id={id} action={action} className={cn('relative', className)}>
      <UrlFormStatus />
      {children}
    </UrlForm>
  );
}
