/**
 * Shop catalogue rules (CAT-002). Price limits match the CHECK constraints in
 * the cat_002 migration.
 */
export const SHOP_CATALOGUE_LIMITS = {
  /** Rs 1 crore, in paise. */
  maxPaise: 1_000_000_000,
  favouriteShades: 500,
  ownShades: 1000,
} as const;

/**
 * Onboarding (D-012): the shop needs this many active products, each with at
 * least one pack size, before it can be submitted for review. Counting rule
 * is an assumption recorded in the CAT-002 spec.
 */
export const ONBOARDING_MIN_PRODUCTS = 10;
