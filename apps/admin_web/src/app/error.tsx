'use client';

import { RouteError } from '@/components/layout/route-error';

/** Errors on pages outside the consoles, e.g. sign-in and register (UX-001). */
export default function RootError({ retry }: { retry: () => void }) {
  return (
    <RouteError
      retry={retry}
      fullScreen
      back={{ href: '/', label: 'Home page' }}
    />
  );
}
