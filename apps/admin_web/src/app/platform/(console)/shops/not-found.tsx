import { ButtonLink } from '@/components/ui/button-link';
import { StateMessage } from '@/components/ui/state-message';

export default function PlatformShopNotFound() {
  return (
    <StateMessage
      title="Shop not found"
      description="No shop has this ID. It may have been mistyped."
      action={
        <ButtonLink href="/platform/shops" variant="secondary">
          Back to all shops
        </ButtonLink>
      }
    />
  );
}
