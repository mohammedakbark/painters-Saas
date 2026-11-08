'use client';

import { useState, useTransition } from 'react';
import type { CatalogueFormState } from '@/lib/catalogue/form-state';
import { Button } from './button';
import { ConfirmDialog } from './confirm-dialog';
import { showToast } from './toast';

/**
 * A destructive or hard-to-undo action that asks first (UX-001, DESIGN_SYSTEM
 * §6): remove, archive. The result shows as a page toast (`ToastHost` in the
 * console layout), because the row may disappear after the change.
 */
export function ConfirmActionButton({
  action,
  label,
  accessibleLabel,
  title,
  message,
  confirmLabel,
  variant = 'tertiary',
  size = 'compact',
  className,
}: {
  action: () => Promise<CatalogueFormState>;
  label: string;
  accessibleLabel?: string;
  title: string;
  message: string;
  confirmLabel: string;
  variant?: 'secondary' | 'tertiary';
  size?: 'default' | 'compact';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        aria-haspopup="dialog"
        aria-label={accessibleLabel}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      <ConfirmDialog
        open={open}
        title={title}
        message={message}
        confirmLabel={confirmLabel}
        pending={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          start(async () => {
            const result = await action();
            setOpen(false);
            showToast({ text: result.error ?? result.saved ?? 'Done.' });
          })
        }
      />
    </>
  );
}
