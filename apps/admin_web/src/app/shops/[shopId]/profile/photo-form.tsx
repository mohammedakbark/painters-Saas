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
  checkPhotoFile,
  PHOTO_ACCEPT,
  type PhotoFormState,
} from '@/lib/shops/photo';

export type UploadPhotoAction = (
  previous: PhotoFormState,
  formData: FormData,
) => Promise<PhotoFormState>;

/**
 * The shop photo (SHP-004): the current photo, a local preview of the chosen
 * file and the upload. Images are pre-sized WebP from object storage, so a
 * plain <img> is used (next/image would need the storage host at build time).
 */
export function ShopPhotoForm({
  action,
  currentUrl,
  canEdit,
}: {
  action: UploadPhotoAction;
  currentUrl: string | null;
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [preview, setPreview] = useState<string | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const error = checkError ?? state.error;

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
    const problem = checkPhotoFile(file);
    setCheckError(problem);
    setPreview(file && !problem ? URL.createObjectURL(file) : null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const problem = checkPhotoFile(data.get('photo') as File | null);
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
      encType="multipart/form-data"
      className="flex flex-col gap-4"
      aria-describedby={error ? 'photo-error' : undefined}
    >
      <fieldset disabled={!canEdit} className="flex flex-col gap-4">
        <legend className="mb-2 text-heading3 font-semibold">Shop photo</legend>
        <p className="text-body text-text-secondary">
          A clear photo of the shop front. JPEG, PNG or WebP, up to 5 MB. Photo
          details such as the camera and location are removed.
        </p>
        <div className="flex aspect-4/3 w-full max-w-form items-center justify-center overflow-hidden rounded-large border border-border-default bg-surface-subtle">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element -- see the component comment
            <img
              src={shown}
              alt={
                preview ? 'Preview of the chosen photo' : 'Current shop photo'
              }
              className="size-full object-cover"
            />
          ) : (
            <p className="px-4 text-center text-body text-text-secondary">
              No photo yet.
            </p>
          )}
        </div>
        {canEdit ? (
          <div className="flex flex-col gap-2">
            <label
              htmlFor="field-photo"
              className="text-body font-medium text-text-primary"
            >
              {currentUrl ? 'Choose a new photo' : 'Choose a photo'}
            </label>
            <input
              id="field-photo"
              name="photo"
              type="file"
              accept={PHOTO_ACCEPT}
              onChange={choose}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'photo-error' : undefined}
              className="text-body text-text-primary file:mr-4 file:min-h-12 file:rounded-medium file:border file:border-border-strong file:bg-surface-default file:px-5 file:text-body-large file:font-semibold"
            />
          </div>
        ) : null}
        {error ? (
          <p
            id="photo-error"
            role="alert"
            className="text-body text-status-error"
          >
            {error}
          </p>
        ) : null}
        {canEdit ? (
          <div>
            <Button type="submit" pending={pending} pendingLabel="Uploading…">
              Upload photo
            </Button>
          </div>
        ) : null}
      </fieldset>
    </form>
  );
}
