import { z } from 'zod';

/** Same rules as RegisterShopRequest in the API; the API re-validates. */
export const registerShopSchema = z.object({
  shopName: z
    .string()
    .trim()
    .min(2, { error: 'The shop name must be at least 2 characters.' })
    .max(120, { error: 'The shop name must be at most 120 characters.' }),
  ownerName: z
    .string()
    .trim()
    .min(1, { error: 'Enter your name.' })
    .max(100, { error: 'Your name must be at most 100 characters.' }),
});

export type RegisterShopInput = z.infer<typeof registerShopSchema>;
type RegisterShopField = keyof RegisterShopInput;

export interface RegisterShopFormState {
  values: { shopName: string; ownerName: string };
  formError?: string;
  fieldErrors?: Partial<Record<RegisterShopField, string>>;
}

export const REGISTER_SHOP_MESSAGES = {
  phoneRequired: 'Sign in with your mobile number to register a shop.',
  unavailable:
    "We couldn't register your shop right now. Try again in a moment.",
} as const;

/** Keeps the first message per known field, from Zod issues or API problem errors. */
export function registerFieldErrors(
  errors: readonly { path: string; message: string }[],
): RegisterShopFormState['fieldErrors'] {
  const fieldErrors: RegisterShopFormState['fieldErrors'] = {};
  for (const { path, message } of errors) {
    if ((path === 'shopName' || path === 'ownerName') && !fieldErrors[path]) {
      fieldErrors[path] = message;
    }
  }
  return fieldErrors;
}
