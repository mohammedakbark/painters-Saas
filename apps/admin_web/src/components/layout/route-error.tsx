'use client';

import { Button } from '@/components/ui/button';
import { StateMessage } from '@/components/ui/state-message';

/** Body of an `error.tsx` boundary, e.g. when the API or Supabase is unreachable. */
export function RouteError({ retry }: { retry: () => void }) {
  return (
    <main className="flex min-h-dvh items-center px-4 py-12">
      <StateMessage
        role="alert"
        title="We couldn't load this page"
        description="The service may be temporarily unavailable. Try again in a moment."
        action={
          <Button variant="secondary" onClick={() => retry()}>
            Try again
          </Button>
        }
      />
    </main>
  );
}
