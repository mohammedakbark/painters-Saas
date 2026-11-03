'use client';

import { RouteError } from '@/components/layout/route-error';

/** Error boundary for every /shops page and the shop console layout. */
export default function ShopsError({ retry }: { retry: () => void }) {
  return <RouteError retry={retry} />;
}
