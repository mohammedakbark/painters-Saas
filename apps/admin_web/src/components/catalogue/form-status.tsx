import { Alert } from '@/components/ui/alert';
import type { CatalogueFormState } from '@/lib/catalogue/form-state';

/** The error or success message of a catalogue form. */
export function FormStatus({ state }: { state: CatalogueFormState }) {
  if (state.error) {
    return (
      <Alert tone="error" title="Not saved">
        {state.error}
      </Alert>
    );
  }
  if (state.saved) {
    return <Alert tone="success">{state.saved}</Alert>;
  }
  return null;
}
