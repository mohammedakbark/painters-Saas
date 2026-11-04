/**
 * Image uploads (shop photos SHP-004, product images CAT-001). The API
 * validates the real format, re-encodes and strips metadata; these checks
 * only give quick feedback in the browser.
 */
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** iPhones convert HEIC to JPEG when the input only accepts these types. */
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';

const ACCEPTED_TYPES = new Set(IMAGE_ACCEPT.split(','));

export type ImageNoun = 'photo' | 'image';

export interface ImageFormState {
  error?: string;
}

/** "a photo", "an image". */
export function withArticle(noun: ImageNoun): string {
  return `${noun === 'image' ? 'an' : 'a'} ${noun}`;
}

export function imageMessages(noun: ImageNoun) {
  return {
    required: `Choose ${withArticle(noun)} to upload.`,
    type: `Upload a JPEG, PNG or WebP ${noun}.`,
    size: `The ${noun} must be 5 MB or smaller.`,
    notAllowed: `You can't change this ${noun}.`,
    unavailable: `We couldn't upload the ${noun} right now. Try again in a moment.`,
  } as const;
}

/** Quick checks before the upload; returns an error message or null. */
export function checkImageFile(
  file: { size: number; type: string } | null,
  noun: ImageNoun,
): string | null {
  const messages = imageMessages(noun);
  if (!file || file.size === 0) {
    return messages.required;
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return messages.size;
  }
  // Some systems send no type; the API decides from the bytes then.
  if (file.type !== '' && !ACCEPTED_TYPES.has(file.type)) {
    return messages.type;
  }
  return null;
}

/** Maps an API upload error to a message (problem details are client-safe). */
export function imageUploadError(
  error: { status: number; code?: string; problem: { detail?: string } | null },
  noun: ImageNoun,
): string {
  const messages = imageMessages(noun);
  if (error.status === 413) {
    return messages.size;
  }
  if (error.code?.startsWith(`${noun}_`) && error.problem?.detail) {
    return error.problem.detail;
  }
  return messages.unavailable;
}
