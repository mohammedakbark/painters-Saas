'use client';

import {
  type FormEvent,
  startTransition,
  useActionState,
  useState,
} from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CardList } from '@/components/ui/card';
import { FileField } from '@/components/ui/file-field';
import { SelectField } from '@/components/ui/select-field';
import type { ImportResult } from '@/lib/api/platform-catalogue';
import type { ImportFormState } from '@/lib/catalogue/form-state';

export type ImportAction = (
  previous: ImportFormState,
  formData: FormData,
) => Promise<ImportFormState>;

const KINDS = [
  { value: 'shades', label: 'Shades (code, name, preview_hex)' },
  {
    value: 'products',
    label: 'Products (name, category, packs, description, supports_shades)',
  },
];

/**
 * CSV import (CAT-001): check the file first, then import it. The import is
 * all-or-nothing; any row error and nothing is saved.
 */
export function ImportForm({ action }: { action: ImportAction }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [intent, setIntent] = useState<'preview' | 'import'>('preview');
  const result = state.result;

  // Submitting in a transition keeps the chosen file for "Import" after the
  // check (React resets forms after `action` submissions).
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const chosen = submitter?.value === 'import' ? 'import' : 'preview';
    data.set('intent', chosen);
    setIntent(chosen);
    startTransition(() => formAction(data));
  }

  const canImport = Boolean(
    result && result.dryRun && result.errorCount === 0 && result.rows > 0,
  );

  return (
    <form action={formAction} onSubmit={submit} className="flex flex-col gap-5">
      <SelectField label="What the file contains" name="kind" options={KINDS} />
      <FileField
        label="CSV file"
        name="file"
        accept=".csv,text/csv"
        description="Comma-separated, first line is the header, up to 5,000 rows and 2 MB. Download a template below."
      />
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          name="intent"
          value="preview"
          variant={canImport ? 'secondary' : 'primary'}
          pending={pending && intent === 'preview'}
          pendingLabel="Checking…"
          disabled={pending}
        >
          Check file
        </Button>
        <Button
          type="submit"
          name="intent"
          value="import"
          pending={pending && intent === 'import'}
          pendingLabel="Importing…"
          disabled={pending || !canImport}
        >
          Import
        </Button>
      </div>

      {state.error ? (
        <Alert tone="error" title="Import failed">
          {state.error}
        </Alert>
      ) : null}
      {result ? <ImportSummary result={result} /> : null}
    </form>
  );
}

function ImportSummary({ result }: { result: ImportResult }) {
  const counts = `${result.rows} rows: ${result.created} new, ${result.updated} changed, ${result.unchanged} unchanged.`;
  if (result.errorCount > 0) {
    return (
      <div className="flex flex-col gap-3">
        <Alert
          tone="error"
          title={`${result.errorCount} problem${result.errorCount === 1 ? '' : 's'} found. Nothing was imported.`}
        >
          Fix the rows below in the file, then check it again.
        </Alert>
        <CardList>
          {result.errors.map((error) => (
            <li
              key={`${error.row}-${error.message}`}
              className="px-4 py-3 text-body"
            >
              <span className="font-semibold">
                {error.row === 0 ? 'File' : `Row ${error.row}`}:{' '}
              </span>
              {error.message}
            </li>
          ))}
        </CardList>
        {result.errorCount > result.errors.length ? (
          <p className="text-body text-text-secondary">
            Showing the first {result.errors.length} of {result.errorCount}{' '}
            problems.
          </p>
        ) : null}
      </div>
    );
  }
  return result.applied ? (
    <Alert tone="success" title="Imported">
      {counts}
    </Alert>
  ) : (
    <Alert tone="info" title="The file is ready to import">
      {counts} Select Import to save it.
    </Alert>
  );
}
