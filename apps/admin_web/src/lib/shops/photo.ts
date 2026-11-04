/** Shop photo upload (SHP-004). The API re-checks everything. */

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

/** iPhones convert HEIC to JPEG when the input only accepts these types. */
export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';

const ACCEPTED_TYPES = new Set(PHOTO_ACCEPT.split(','));

export interface PhotoFormState {
  error?: string;
}

export const PHOTO_MESSAGES = {
  required: 'Choose a photo to upload.',
  type: 'Upload a JPEG, PNG or WebP photo.',
  size: 'The photo must be 5 MB or smaller.',
  notAllowed: 'Only the shop owner can change the photo.',
  unavailable: "We couldn't upload the photo right now. Try again in a moment.",
} as const;

/** Quick checks before the upload; returns an error message or null. */
export function checkPhotoFile(
  file: { size: number; type: string } | null,
): string | null {
  if (!file || file.size === 0) {
    return PHOTO_MESSAGES.required;
  }
  if (file.size > PHOTO_MAX_BYTES) {
    return PHOTO_MESSAGES.size;
  }
  // Some systems send no type; the API decides from the bytes then.
  if (file.type !== '' && !ACCEPTED_TYPES.has(file.type)) {
    return PHOTO_MESSAGES.type;
  }
  return null;
}
