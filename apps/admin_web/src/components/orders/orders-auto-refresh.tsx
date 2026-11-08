'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useEffect, useRef } from 'react';
import { showToast } from '@/components/ui/toast';

export const REFRESH_EVERY_MS = 30_000;

/** How many orders arrived since the last check, or 0. */
export function newOrders(previous: number | null, total: number): number {
  return previous === null ? 0 : Math.max(0, total - previous);
}

/**
 * Keeps the Orders list current (ORD-002): every 30 seconds, while the tab
 * is visible and no side sheet is open, it refreshes the server data without
 * reloading the page, and says when new orders came in.
 */
export function OrdersAutoRefresh({
  total,
  newHref,
}: {
  /** All orders of the shop (the "All" count). */
  total: number;
  /** The New tab. */
  newHref: string;
}) {
  const router = useRouter();
  const seen = useRef<number | null>(null);

  useEffect(() => {
    const arrived = newOrders(seen.current, total);
    seen.current = total;
    if (arrived > 0) {
      showToast({
        text: arrived === 1 ? '1 new order' : `${arrived} new orders`,
        link: { href: newHref, label: 'Show' },
      });
    }
  }, [total, newHref]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (
        document.visibilityState !== 'visible' ||
        document.querySelector('dialog[open]')
      ) {
        return;
      }
      startTransition(() => router.refresh());
    }, REFRESH_EVERY_MS);
    return () => window.clearInterval(timer);
  }, [router]);

  return null;
}
