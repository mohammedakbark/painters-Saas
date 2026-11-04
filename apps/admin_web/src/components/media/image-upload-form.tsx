'use client';

import {
  type ChangeEvent,
  type FormEvent,
  startTransition,
  useActionState,
  useEffect,
  useState,
} from 'react';
import { Button } from '@/components/ui/button';
import {
  checkImageFile,
  IMAGE_ACCEPT,
  type ImageFormState,
  type ImageNoun,
  withArticle,
} from '@/lib/media/image-file';

export type UploadImageAction = (
  previous: ImageFormState,
  formData: FormData,
) => Promise<ImageFormState>;

/**
 * One public image (shop photo, product image): the current image, a local
 * preview of the chosen file and the upload. Images are pre-sized WebP from
 * object storage, so a plain <img> is used (next/image would need the storage
 * host at build time).
 */
export function ImageUploadForm({
  action,
  currentUrl,
  canEdit,
  title,
  description,
  noun,
  fieldName,
}: {
  action: UploadImageAction;
  currentUrl: string | null;
  canEdit: boolean;
  title: string;
  description: string;
  noun: ImageNoun;
  /** Form field the action reads, for example "photo". */
  fieldName: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [preview, setPreview] = useState<string | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const error = checkError ?? state.error;
  const inputId = `field-${fieldName}`;
  const errorId = `${fieldName}-error`;

  // Release the preview's object URL when it changes or the form unmounts.
  useEffect(
    () => () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    },
    [preview],
  );

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    const problem = checkImageFile(file, noun);
    setCheckError(problem);
    setPreview(file && !problem ? URL.createObjectURL(file) : null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const problem = checkImageFile(data.get(fieldName) as File | null, noun);
    setCheckError(problem);
    if (!problem) {
      startTransition(() => formAction(data));
    }
  }

  const shown = preview ?? currentUrl;

  return (
    <form
      action={formAction}
      onSubmit={submit}
      className="flex flex-col gap-4"
      aria-describedby={error ? errorId : undefined}
    >
      <fieldset disabled={!canEdit} className="flex flex-col gap-4">
        <legend className="mb-2 text-heading3 font-semibold">{title}</legend>
        <p className="text-body text-text-secondary">{description}</p>
        <div className="flex aspect-4/3 w-full max-w-form items-center justify-center overflow-hidden rounded-large border border-border-default bg-surface-subtle">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element -- see the component comment
            <img
              src={shown}
              alt={
                preview
                  ? `Preview of the chosen ${noun}`
                  : `Current ${title.toLowerCase()}`
              }
              className="size-full object-cover"
            />
          ) : (
            <p className="px-4 text-center text-body text-text-secondary">
              No {noun} yet.
            </p>
          )}
        </div>
        {canEdit ? (
          <div className="flex flex-col gap-2">
            <label
              htmlFor={inputId}
              className="text-body font-medium text-text-primary"
            >
              {currentUrl
                ? `Choose a new ${noun}`
                : `Choose ${withArticle(noun)}`}
            </label>
            <input
              id={inputId}
              name={fieldName}
              type="file"
              accept={IMAGE_ACCEPT}
              onChange={choose}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className="text-body text-text-primary file:mr-4 file:min-h-12 file:rounded-medium file:border file:border-border-strong file:bg-surface-default file:px-5 file:text-body-large file:font-semibold"
            />
          </div>
        ) : null}
        {error ? (
          <p id={errorId} role="alert" className="text-body text-status-error">
            {error}
          </p>
        ) : null}
        {canEdit ? (
          <div>
            <Button type="submit" pending={pending} pendingLabel="Uploading…">
              Upload {noun}
            </Button>
          </div>
        ) : null}
      </fieldset>
    </form>
  );
}
