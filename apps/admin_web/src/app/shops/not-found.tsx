import { ButtonLink } from '@/components/ui/button-link';
import { StateMessage } from '@/components/ui/state-message';

/**
 * Shown for unknown shops and for shops the user is not a member of. Both look
 * the same on purpose, so the page never reveals whether a shop exists.
 */
export default function ShopNotFound() {
  return (
    <main className="flex min-h-dvh items-center px-4 py-12">
      <StateMessage
        title="Shop not found"
        description="This shop doesn't exist, or your account doesn't have access to it."
        action={
          <ButtonLink href="/shops" variant="secondary">
            Go to your shops
          </ButtonLink>
        }
      />
    </main>
  );
}
