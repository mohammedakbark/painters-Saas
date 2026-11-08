import { ButtonLink } from '@/components/ui/button-link';
import { StateMessage } from '@/components/ui/state-message';

/** Unknown reviews, shown inside the console (UX-001). */
export default function NotFound() {
  return (
    <div className="py-8">
      <StateMessage
        icon="search"
        title="Review not found"
        description="This shop doesn’t exist or has no review to show."
        action={
          <ButtonLink href="/platform/reviews" variant="secondary">
            Back to reviews
          </ButtonLink>
        }
      />
    </div>
  );
}
