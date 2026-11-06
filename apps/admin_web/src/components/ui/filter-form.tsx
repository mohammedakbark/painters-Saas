'use client';

import type { ReactNode } from 'react';

/**
 * The GET form behind `ColumnFilter`s (CAT-003). Empty filters are left out
 * of the URL, so links stay short ("?available=false", not "?q=&brand=…").
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
    <form
      id={id}
      method="get"
      action={action}
      className={className}
      onSubmit={(event) => {
        for (const element of event.currentTarget.elements) {
          if (
            (element instanceof HTMLInputElement ||
              element instanceof HTMLSelectElement) &&
            element.name &&
            element.value === ''
          ) {
            element.disabled = true;
          }
        }
      }}
    >
      {children}
    </form>
  );
}
