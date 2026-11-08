'use client';

import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { StateMessage } from '@/components/ui/state-message';

/**
 * Body of an `error.tsx` boundary, e.g. when the API is unreachable (UX-001).
 * Inside a console it renders in the page area, so the menu stays; outside
 * one (`fullScreen`) it fills the window.
 */
export function RouteError({
  retry,
  back,
  fullScreen = false,
}: {
  retry: () => void;
  /** A way out, e.g. back to the Overview. */
  back?: { href: string; label: string };
  fullScreen?: boolean;
}) {
  const message = (
    <StateMessage
      role="alert"
      icon="alertCircle"
      title="We couldn’t load this page"
      description="The service may be busy or briefly unavailable. Your data is safe; try again in a moment."
      action={
        <>
          <Button onClick={() => retry()}>Try again</Button>
          {back ? (
            <ButtonLink href={back.href} variant="secondary">
              {back.label}
            </ButtonLink>
          ) : null}
        </>
      }
    />
  );
  return fullScreen ? (
    <main className="flex min-h-dvh items-center px-4 py-12">{message}</main>
  ) : (
    <div className="py-8">{message}</div>
  );
}
