import type { ImportResult } from '@/lib/api/platform-catalogue';

/** State returned by the platform catalogue Server Actions (CAT-001). */
export interface CatalogueFormState {
  /** Shown as an error alert. */
  error?: string;
  /** Shown as a success status. */
  saved?: string;
  /** A follow-up link for the success toast, e.g. "Open product" (WEB-007). */
  savedLink?: { href: string; label: string };
  /** Field errors keyed by form field name. */
  fieldErrors?: Record<string, string>;
  /** Submitted values, so the form keeps them after an error. */
  values?: Record<string, string>;
}

export const CATALOGUE_MESSAGES = {
  unavailable: "We couldn't save that right now. Try again in a moment.",
} as const;

/** Maps API field paths (`packs.0.quantity`, `name`) to form field names. */
export function catalogueFieldErrors(
  errors: readonly { path: string; message: string }[],
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const { path, message } of errors) {
    const field = path.split('.')[0] || 'form';
    fieldErrors[field] ??= message;
  }
  return fieldErrors;
}

/** Reads text fields of a form into plain values. */
export function formValues(
  formData: FormData,
  names: readonly string[],
): Record<string, string> {
  return Object.fromEntries(
    names.map((name) => [name, String(formData.get(name) ?? '')]),
  );
}

/** State of the CSV import form. */
export interface ImportFormState {
  error?: string;
  result?: ImportResult;
}
