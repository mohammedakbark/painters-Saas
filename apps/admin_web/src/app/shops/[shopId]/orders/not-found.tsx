'use client';

import { useParams } from 'next/navigation';
import { ButtonLink } from '@/components/ui/button-link';
import { StateMessage } from '@/components/ui/state-message';

/** Unknown orders, shown inside the console (UX-001). */
export default function NotFound() {
  const { shopId } = useParams<{ shopId: string }>();
  return (
    <div className="py-8">
      <StateMessage
        icon="search"
        title="Order not found"
        description="This order doesn’t exist or belongs to another shop."
        action={
          <ButtonLink
            href={`/shops/${encodeURIComponent(shopId)}/orders`}
            variant="secondary"
          >
            Back to orders
          </ButtonLink>
        }
      />
    </div>
  );
}
