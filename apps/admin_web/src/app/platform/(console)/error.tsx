'use client';

import { RouteError } from '@/components/layout/route-error';

/** Errors inside the platform console: the menu stays (UX-001). */
export default function PlatformConsoleError({ retry }: { retry: () => void }) {
  return (
    <RouteError
      retry={retry}
      back={{ href: '/platform', label: 'Go to Overview' }}
    />
  );
}
