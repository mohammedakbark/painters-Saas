'use client';

import { useEffect, useId, useRef } from 'react';
import { Button } from './button';

/**
 * Asks before a destructive or hard-to-undo action (WEB-005, DESIGN_SYSTEM
 * §6). A native modal <dialog>: focus stays inside, Escape cancels.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  pending = false,
  tone = 'danger',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  pending?: boolean;
  tone?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) {
      return;
    }
    if (open && !element.open) {
      // Every supported browser has showModal; the fallback is for tests.
      if (typeof element.showModal === 'function') {
        element.showModal();
      } else {
        element.setAttribute('open', '');
      }
    } else if (!open && element.open) {
      if (typeof element.close === 'function') {
        element.close();
      } else {
        element.removeAttribute('open');
      }
    }
  }, [open]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-form rounded-sheet border border-card-border bg-dialog-background p-6 text-text-primary shadow-xl backdrop:bg-text-primary/40"
    >
      <h2 id={titleId} className="text-heading3 font-semibold">
        {title}
      </h2>
      <p id={messageId} className="mt-2 text-body-large text-text-secondary">
        {message}
      </p>
      <div className="mt-6 flex flex-col-reverse gap-3 medium:flex-row medium:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button
          variant={tone === 'danger' ? 'destructive' : 'primary'}
          onClick={onConfirm}
          pending={pending}
          pendingLabel="Working…"
        >
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
