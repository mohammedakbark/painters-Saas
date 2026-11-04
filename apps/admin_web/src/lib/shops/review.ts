/** Shop review reasons and their wording (PLT-002, D-032). */
export const REVIEW_REASONS = [
  'PHOTO_MISSING_OR_UNCLEAR',
  'LOCATION_MISSING_OR_WRONG',
  'ADDRESS_INCOMPLETE',
  'SUPPORT_PHONE_INVALID',
  'PRODUCTS_INSUFFICIENT',
  'PRODUCT_DETAILS_INCORRECT',
  'OTHER',
] as const;

export type ReviewReason = (typeof REVIEW_REASONS)[number];

const LABELS: Record<ReviewReason, string> = {
  PHOTO_MISSING_OR_UNCLEAR: 'The shop photo is missing or unclear',
  LOCATION_MISSING_OR_WRONG: 'The map location is missing or wrong',
  ADDRESS_INCOMPLETE: 'The address is incomplete',
  SUPPORT_PHONE_INVALID: 'The support mobile number does not work',
  PRODUCTS_INSUFFICIENT: 'Not enough products',
  PRODUCT_DETAILS_INCORRECT: 'Some product details or prices are wrong',
  OTHER: 'Other (see the note)',
};

export function reviewReasonLabel(reason: string): string {
  return LABELS[reason as ReviewReason] ?? reason;
}

export const REVIEW_NOTE_MAX = 1000;

/** Names of onboarding checklist items, for "still to do" lists. */
const ITEM_NAMES: Record<string, string> = {
  address: 'shop address',
  location: 'map location',
  support_phone: 'support mobile',
  photo: 'shop photo',
  products: '10 products',
};

export function checklistItemName(key: string): string {
  return ITEM_NAMES[key] ?? key;
}
