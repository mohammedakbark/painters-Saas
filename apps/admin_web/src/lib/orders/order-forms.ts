/** Checks shared by the order forms and their Server Actions (ORD-002). */

export const ORDER_NOTE_MAX = 200;

/**
 * The message from a "choose a ready message or write your own" field pair
 * (`<prefix>Choice`, `<prefix>Text`): the choice is a ready message, or
 * "custom" to use the text. Prefixes keep ids unique when several sheets sit
 * on one page.
 */
export function noteFrom(
  values: Record<string, string>,
  prefix: string,
): string {
  const choice = values[`${prefix}Choice`] ?? '';
  const text =
    choice === 'custom' || choice === '' ? values[`${prefix}Text`] : choice;
  return (text ?? '').trim();
}

/** The field that shows a message error: the radio list or the own text. */
export function messageField(
  values: Record<string, string>,
  prefix: string,
): string {
  const choice = values[`${prefix}Choice`];
  return choice && choice !== 'custom' ? `${prefix}Choice` : `${prefix}Text`;
}

/** Form field names of a message pair. */
export const messageFields = (prefix: string) =>
  [`${prefix}Choice`, `${prefix}Text`] as const;

/** A required reason of 1 to 200 characters, or the error to show. */
export function checkReason(reason: string): string | null {
  if (reason.length === 0) {
    return 'Enter a reason.';
  }
  if (reason.length > ORDER_NOTE_MAX) {
    return 'The reason can be at most 200 characters.';
  }
  return null;
}

/** A whole quantity from 1 to 999, or the error to show. */
export function checkQuantity(text: string): number | string {
  const value = Number(text.trim());
  if (!/^\d+$/.test(text.trim()) || value < 1 || value > 999) {
    return 'Enter a quantity from 1 to 999.';
  }
  return value;
}
