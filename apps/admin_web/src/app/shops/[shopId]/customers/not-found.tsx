'use client';

import { useParams } from 'next/navigation';
import { ButtonLink } from '@/components/ui/button-link';
import { StateMessage } from '@/components/ui/state-message';

/** Unknown customers, shown inside the console (UX-001). */
export default function NotFound() {
  const { shopId } = useParams<{ shopId: string }>();
  return (
    <div className="py-8">
      <StateMessage
        icon="search"
        title="Customer not found"
        description="This customer doesn’t exist or belongs to another shop."
        action={
          <ButtonLink
            href={`/shops/${encodeURIComponent(shopId)}/customers`}
            variant="secondary"
          >
            Back to customers
          </ButtonLink>
        }
      />
    </div>
  );
}
