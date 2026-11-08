import { ButtonLink } from '@/components/ui/button-link';
import { StateMessage } from '@/components/ui/state-message';

/** Unknown addresses anywhere in the site (UX-001). */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center bg-surface-subtle px-4 py-12">
      <StateMessage
        icon="search"
        title="Page not found"
        description="The address may be wrong, or the page has moved."
        action={
          <>
            <ButtonLink href="/shops">Go to your shops</ButtonLink>
            <ButtonLink href="/" variant="secondary">
              Home page
            </ButtonLink>
          </>
        }
      />
    </main>
  );
}
