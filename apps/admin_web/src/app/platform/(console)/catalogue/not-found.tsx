import { ButtonLink } from '@/components/ui/button-link';
import { StateMessage } from '@/components/ui/state-message';

export default function CatalogueNotFound() {
  return (
    <StateMessage
      title="Not found"
      description="This brand or product doesn't exist. It may have been mistyped."
      action={
        <ButtonLink href="/platform/catalogue" variant="secondary">
          Back to the catalogue
        </ButtonLink>
      }
    />
  );
}
