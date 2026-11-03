'use client';

import { Button } from '@/components/ui/button';
import { StateMessage } from '@/components/ui/state-message';

/**
 * Error boundary for every /platform page and the console layout, shown for
 * example when the API or Supabase Auth is unreachable.
 */
export default function PlatformError({ retry }: { retry: () => void }) {
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
