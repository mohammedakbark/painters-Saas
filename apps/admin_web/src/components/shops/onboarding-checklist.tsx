import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/cn';
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
  photo: {
    label: 'Shop photo',
    hint: 'A clear photo of the shop front.',
    path: 'profile',
  },
  products: {
    label: 'Products',
    hint: 'At least 10 products on sale, each with a price.',
    path: 'catalogue',
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
  const total = onboarding.items.length;
  const done = onboarding.items.filter((item) => item.done).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <Card
      as="section"
      aria-labelledby="onboarding-heading"
      className="flex flex-col gap-5 p-6"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="onboarding-heading" className="text-heading3 font-semibold">
            Get your shop ready
          </h2>
          <p className="text-body font-medium text-text-secondary">
            {done} of {total} done
          </p>
        </div>
        <div
          role="progressbar"
          aria-labelledby="onboarding-heading"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
          className="h-2 overflow-hidden rounded-badge bg-border-default"
        >
          <div
            className="h-full rounded-badge bg-brand-primary transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <ul className="flex flex-col divide-y divide-border-default">
        {onboarding.items.map((item) => {
          const meta = ITEMS[item.key] ?? {
            label: item.key,
            hint: '',
            path: '',
          };
          return (
            <li key={item.key} className="flex items-start gap-4 py-4">
              <span
                aria-hidden="true"
                className={cn(
                  'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-badge',
                  item.done
                    ? 'bg-status-success text-surface-default'
                    : 'border-2 border-dashed border-border-strong',
                )}
              >
                {item.done ? <Icon name="check" className="size-4" /> : null}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-body-large font-semibold text-text-primary">
                  {meta.label}
                </span>
                {meta.hint ? (
                  <span className="text-body text-text-secondary">
                    {meta.hint}
                  </span>
                ) : null}
                {item.progress ? (
                  <span className="text-body font-medium text-text-primary">
                    {item.progress.current} of {item.progress.required} added
                  </span>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 medium:flex-row medium:items-center medium:gap-3">
                {item.done ? (
                  <Badge tone="success">Done</Badge>
                ) : (
                  <>
                    <Badge tone="warning">To do</Badge>
                    {meta.path ? (
                      <Link
                        href={`/shops/${shopId}/${meta.path}`}
                        aria-label={`Add ${meta.label.toLowerCase()}`}
                        className="group -mr-2 inline-flex min-h-11 items-center gap-1 rounded-nav-item px-2 text-body font-semibold text-brand-primary hover:bg-brand-primary-soft focus-visible:outline-2 focus-visible:outline-brand-primary"
                      >
                        Add
                        <Icon
                          name="arrowRight"
                          className="size-4 transition-transform group-hover:translate-x-0.5"
                        />
                      </Link>
                    ) : null}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
