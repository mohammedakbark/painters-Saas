'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { IconButton } from './icon-button';

export interface ToastMessage {
  text: string;
  /** An optional follow-up, for example "Open product". */
  link?: { href: string; label: string };
}

const SHOW_FOR_MS = 8000;

/**
 * A short confirmation at the bottom of the screen (WEB-007), for example
 * after a side sheet saves. Read out by screen readers; closes by itself.
 */
export function Toast({
  message,
  onDismiss,
}: {
  message: ToastMessage;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, SHOW_FOR_MS);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <div
      role="status"
      className="toast-enter fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-narrow items-center gap-3 rounded-snackbar bg-snackbar-background py-2 pr-2 pl-4 text-body font-semibold text-snackbar-foreground shadow-xl"
    >
      <span className="flex-1">{message.text}</span>
      {message.link ? (
        <Link
          href={message.link.href}
          className="rounded-nav-item px-2 py-1 text-snackbar-action underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-snackbar-action"
        >
          {message.link.label}
        </Link>
      ) : null}
      <IconButton
        icon="close"
        label="Dismiss"
        onClick={onDismiss}
        className="text-snackbar-foreground hover:bg-transparent hover:text-snackbar-action"
      />
    </div>
  );
}
