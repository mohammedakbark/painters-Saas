'use client';

import { useActionState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { showToast } from '@/components/ui/toast';
import type { CatalogueFormState } from '@/lib/catalogue/form-state';

/**
 * One-click order step (ORD-002): "Start packing", "Mark completed", … The
 * result shows as a page toast, because the row may leave the current tab.
 */
export function StepButton({
  action,
  label,
  accessibleLabel,
  variant = 'secondary',
  inRow = false,
}: {
  action: () => Promise<CatalogueFormState>;
  label: string;
  /** Names the order for screen readers, e.g. "Start packing #1001". */
  accessibleLabel?: string;
  variant?: 'primary' | 'secondary' | 'tertiary';
  /** A compact text action in a table row, lined up with the text above. */
  inRow?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  useEffect(() => {
    if (state.saved) {
      showToast({ text: state.saved });
    } else if (state.error) {
      showToast({ text: state.error });
    }
  }, [state]);
  return (
    <form action={formAction}>
      <Button
        type="submit"
        variant={variant}
        pending={pending}
        pendingLabel="Saving…"
        aria-label={accessibleLabel}
        size={inRow ? 'compact' : 'default'}
        className={inRow ? '-mx-3 whitespace-nowrap' : 'whitespace-nowrap'}
      >
        {label}
      </Button>
    </form>
  );
}
