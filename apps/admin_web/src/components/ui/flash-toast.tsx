'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { showToast } from './toast';

/**
 * Shows a one-time confirmation after a redirect (for example `?added=3`)
 * as a toast, then removes the parameter from the address, so a reload or a
 * shared link never repeats it (UX-002).
 */
export function FlashToast({
  param,
  message,
}: {
  /** The query parameter that carried the result. */
  param: string;
  message: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) {
      return;
    }
    shown.current = true;
    showToast({ text: message });
    const next = new URLSearchParams(search.toString());
    next.delete(param);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [message, param, pathname, router, search]);

  return null;
}
