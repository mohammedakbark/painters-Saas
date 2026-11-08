'use client';

import { useRouter } from 'next/navigation';
import { Component, type ReactNode, startTransition } from 'react';
import { Button } from './button';
import { Icon } from './icon';

/** Next.js uses errors for redirect() and notFound(); those must pass through. */
function isNavigationSignal(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return (
    typeof digest === 'string' &&
    (digest.startsWith('NEXT_REDIRECT') ||
      digest.startsWith('NEXT_HTTP_ERROR_FALLBACK') ||
      digest === 'NEXT_NOT_FOUND')
  );
}

interface BoundaryProps {
  children: ReactNode;
  fallback: (retry: () => void) => ReactNode;
}

class Boundary extends Component<BoundaryProps, { error: unknown }> {
  state: { error: unknown } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (error !== null) {
      if (isNavigationSignal(error)) {
        throw error;
      }
      return this.props.fallback(() => this.setState({ error: null }));
    }
    return this.props.children;
  }
}

/**
 * Keeps one failing section from taking the page down (UX-001): the rest
 * of the page stays, and this section shows a short message with Try again,
 * which reloads only the server data (no page reload).
 */
export function SectionBoundary({
  what,
  children,
}: {
  /** Names the section, e.g. "orders": "We couldn't load orders." */
  what: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <Boundary
      fallback={(reset) => (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-card border border-card-border bg-card-background p-5 medium:flex-row medium:items-center medium:justify-between"
        >
          <span className="flex items-start gap-3">
            <Icon
              name="alertCircle"
              className="mt-0.5 size-5 shrink-0 text-status-error"
            />
            <span className="flex flex-col gap-1">
              <span className="font-semibold">We couldn’t load {what}.</span>
              <span className="text-body text-text-secondary">
                The rest of the page still works. Try again in a moment.
              </span>
            </span>
          </span>
          <Button
            variant="secondary"
            size="compact"
            className="shrink-0"
            onClick={() =>
              startTransition(() => {
                reset();
                router.refresh();
              })
            }
          >
            Try again
          </Button>
        </div>
      )}
    >
      {children}
    </Boundary>
  );
}
