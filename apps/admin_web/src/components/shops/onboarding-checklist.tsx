import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { ShopOnboarding } from '@/lib/api/shop-profile';

/** What each checklist item means and where it is fixed. */
const ITEMS: Record<string, { label: string; hint: string; path: string }> = {
  address: {
    label: 'Shop address',
    hint: 'Street, city, district, state and PIN code.',
    path: 'profile',
  },
  location: {
    label: 'Map location',
    hint: 'A pin at the shop, so customers can find it.',
    path: 'profile',
  },
  support_phone: {
    label: 'Support mobile number',
    hint: 'The number customers contact.',
    path: 'profile',
  },
};

/**
 * The onboarding checklist (D-012). The API decides what is done; this only
 * shows it, with the status in words and a link to fix each open item.
 */
export function OnboardingChecklist({
  shopId,
  onboarding,
}: {
  shopId: string;
  onboarding: ShopOnboarding;
}) {
  const done = onboarding.items.filter((item) => item.done).length;

  return (
    <section
      aria-labelledby="onboarding-heading"
      className="flex flex-col gap-4 rounded-large border border-border-default bg-surface-default p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="onboarding-heading" className="text-heading3 font-semibold">
          Get your shop ready
        </h2>
        <p className="text-body text-text-secondary">
          {done} of {onboarding.items.length} done
        </p>
      </div>
      <ul className="flex flex-col divide-y divide-border-default">
        {onboarding.items.map((item) => {
          const meta = ITEMS[item.key] ?? {
            label: item.key,
            hint: '',
            path: '',
          };
          return (
            <li
              key={item.key}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-body-large font-medium text-text-primary">
                  {meta.label}
                </span>
                {meta.hint ? (
                  <span className="text-body text-text-secondary">
                    {meta.hint}
                  </span>
                ) : null}
              </div>
              {item.done ? (
                <Badge tone="success">Done</Badge>
              ) : (
                <div className="flex items-center gap-3">
                  <Badge tone="warning">To do</Badge>
                  <Link
                    href={`/shops/${shopId}/${meta.path}`}
                    aria-label={`Add ${meta.label.toLowerCase()}`}
                    className="text-body font-semibold text-brand-primary underline underline-offset-4"
                  >
                    Add
                  </Link>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
