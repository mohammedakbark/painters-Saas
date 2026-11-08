'use client';

import { RouteError } from '@/components/layout/route-error';

/** Error boundary for every /platform page and the console layout. */
export default function PlatformError({ retry }: { retry: () => void }) {
  return <RouteError retry={retry} fullScreen />;
}
