'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  type FormEvent,
  type ReactNode,
  useContext,
  useTransition,
} from 'react';
import { Button, type ButtonProps } from './button';
import { Spinner } from './spinner';

/*
 * GET forms for search and filters (PERF-001). The values go into the URL
 * like a normal GET form (and still do without JavaScript), but with
 * JavaScript the URL changes through the client router inside a transition:
 * the page stays on screen and only the busy control shows progress, instead
 * of the browser reloading the whole document.
 */

const PendingContext = createContext(false);

/** The URL a GET form would open; empty values are left out. */
export function urlForForm(form: HTMLFormElement, fallback: string): string {
  const query = new URLSearchParams();
  for (const [key, value] of new FormData(form)) {
    if (typeof value === 'string' && value.trim() !== '') {
      query.append(key, value);
    }
  }
  const target = form.getAttribute('action') || fallback;
  const qs = query.toString();
  return qs ? `${target}?${qs}` : target;
}

export function UrlForm({
  action,
  id,
  className,
  role,
  children,
}: {
  /** The page to open; the current page when left out. */
  action?: string;
  /** Lets controls outside the form join it with `form={id}`. */
  id?: string;
  className?: string;
  role?: 'search';
  children?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const url = urlForForm(event.currentTarget, pathname);
    startTransition(() => router.push(url, { scroll: false }));
  }

  return (
    <PendingContext value={pending}>
      <form
        id={id}
        method="get"
        action={action}
        role={role}
        aria-busy={pending || undefined}
        className={className}
        onSubmit={onSubmit}
      >
        {children}
      </form>
    </PendingContext>
  );
}

/** True while the surrounding `UrlForm` is loading its new page. */
export function useUrlFormPending(): boolean {
  return useContext(PendingContext);
}

/** The submit button of a `UrlForm`; shows the spinner while it loads. */
export function UrlFormSubmit(props: Omit<ButtonProps, 'type' | 'pending'>) {
  const pending = useUrlFormPending();
  return <Button {...props} type="submit" pending={pending} />;
}

/**
 * "Updating…" next to filters that apply on change (no submit button).
 * Takes no space when idle, so the layout never jumps.
 */
export function UrlFormStatus({ label = 'Updating…' }: { label?: string }) {
  const pending = useUrlFormPending();
  return (
    <span
      role="status"
      className="pointer-events-none absolute -top-3 right-4 inline-flex items-center gap-1.5 rounded-badge border border-card-border bg-card-background px-2 py-0.5 text-caption text-text-secondary empty:hidden"
    >
      {pending ? (
        <>
          <Spinner className="size-3.5" />
          {label}
        </>
      ) : null}
    </span>
  );
}
