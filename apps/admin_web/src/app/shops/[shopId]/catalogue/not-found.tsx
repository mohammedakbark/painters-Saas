'use client';

import { usePathname } from 'next/navigation';
import { ButtonLink } from '@/components/ui/button-link';
import { StateMessage } from '@/components/ui/state-message';

/**
 * Unknown product (or catalogue product) inside a shop the user can open.
 * A shop the user cannot open is answered by the layout with "Shop not found"
 * before this boundary is reached. not-found pages get no params, so the
 * catalogue link comes from the current path.
 */
export default function CatalogueItemNotFound() {
  const pathname = usePathname();
  const catalogue = `${pathname.split('/catalogue')[0]}/catalogue`;
  return (
    <StateMessage
      title="Product not found"
      description="This product is not in your catalogue, or it is no longer in the brand catalogue."
      action={
        <ButtonLink href={catalogue} variant="secondary">
          Back to your catalogue
        </ButtonLink>
      }
    />
  );
}
