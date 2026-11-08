'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useState } from 'react';
import { IconButton } from './icon-button';

export interface ToastMessage {
  text: string;
  /** An optional follow-up, for example "Open product". */
  link?: { href: string; label: string };
}

const SHOW_FOR_MS = 8000;
const SHOWN_EVENT = 'sevenpalette:toast-shown';
const SHOW_EVENT = 'sevenpalette:show-toast';

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
  const id = useId();

  useEffect(() => {
    const timer = window.setTimeout(onDismiss, SHOW_FOR_MS);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  // One toast at a time: a newer one (from another sheet) replaces this one.
  useEffect(() => {
    const onShown = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) {
        onDismiss();
      }
    };
    window.dispatchEvent(new CustomEvent(SHOWN_EVENT, { detail: id }));
    window.addEventListener(SHOWN_EVENT, onShown);
    return () => window.removeEventListener(SHOWN_EVENT, onShown);
  }, [id, message, onDismiss]);

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

/** Shows a toast through the page's `ToastHost`, from anywhere on the page. */
export function showToast(message: ToastMessage) {
  window.dispatchEvent(new CustomEvent(SHOW_EVENT, { detail: message }));
}

/**
 * Renders toasts sent with `showToast`, for actions whose own component may
 * disappear after the change, such as a row leaving the current tab (ORD-002).
 * Put one on a page.
 */
export function ToastHost() {
  const [message, setMessage] = useState<ToastMessage | null>(null);
  const dismiss = useCallback(() => setMessage(null), []);
  useEffect(() => {
    const onShow = (event: Event) =>
      setMessage({ ...(event as CustomEvent<ToastMessage>).detail });
    window.addEventListener(SHOW_EVENT, onShow);
    return () => window.removeEventListener(SHOW_EVENT, onShow);
  }, []);
  return message ? <Toast message={message} onDismiss={dismiss} /> : null;
}
