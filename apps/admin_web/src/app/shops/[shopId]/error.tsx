'use client';

import { useParams } from 'next/navigation';
import { RouteError } from '@/components/layout/route-error';

/** Errors inside a shop console: the menu stays (UX-001). */
export default function ShopConsoleError({ retry }: { retry: () => void }) {
  const { shopId } = useParams<{ shopId: string }>();
  return (
    <RouteError
      retry={retry}
      back={{
        href: `/shops/${encodeURIComponent(shopId)}`,
        label: 'Go to Overview',
      }}
    />
  );
}
