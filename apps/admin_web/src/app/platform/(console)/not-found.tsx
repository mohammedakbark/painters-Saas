import { ButtonLink } from '@/components/ui/button-link';
import { StateMessage } from '@/components/ui/state-message';

/** Unknown platform pages, inside the console (UX-001). */
export default function NotFound() {
  return (
    <div className="py-8">
      <StateMessage
        icon="search"
        title="Page not found"
        description="This page doesn’t exist in the platform console."
        action={
          <ButtonLink href="/platform" variant="secondary">
            Go to Overview
          </ButtonLink>
        }
      />
    </div>
  );
}
