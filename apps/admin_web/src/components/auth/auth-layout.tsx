import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { BrandMark } from '@/components/brand/brand-mark';
import { Icon, type IconName } from '@/components/ui/icon';
import { BRAND } from '@/lib/brand';

const PROMISES: readonly { icon: IconName; text: string }[] = [
  { icon: 'store', text: 'Your catalogue, prices and stock in one place' },
  { icon: 'smartphone', text: 'Run your shop from the web or the Shop App' },
  { icon: 'lock', text: "Your shop's data stays private to your shop" },
];

/**
 * Sign-in and registration frame (WEB-002): a dark teal brand panel beside
 * the form on wide screens, a compact brand bar above it on phones.
 */
export function AuthLayout({
  title,
  description,
  aside,
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  /** Shown above the title, e.g. the registration steps. */
  aside?: ReactNode;
  children: ReactNode;
  /** Shown under the form, e.g. the link to the other entry. */
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface-subtle desktop:grid desktop:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <BrandPanel />
      <main className="flex flex-1 flex-col items-center px-4 py-8 desktop:justify-center desktop:py-16">
        <div className="reveal flex w-full max-w-form flex-col gap-6">
          {aside}
          <div className="flex flex-col gap-2">
            <h1 className="text-heading1 font-bold tracking-tight text-text-primary">
              {title}
            </h1>
            {description ? (
              <p className="text-body-large text-text-secondary">
                {description}
              </p>
            ) : null}
          </div>
          <div className="rounded-sheet border border-card-border bg-card-background p-6 shadow-xl shadow-brand-primary/5 medium:p-8">
            {children}
          </div>
          {footer ? (
            <div className="text-center text-body text-text-secondary">
              {footer}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function BrandPanel() {
  return (
    <aside className="relative isolate overflow-hidden bg-linear-to-br from-brand-primary to-brand-primary-strong px-4 py-5 text-surface-default desktop:flex desktop:flex-col desktop:justify-between desktop:px-12 desktop:py-12">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute -top-24 -right-24 size-80 rounded-badge bg-brand-accent/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 size-80 rounded-badge bg-brand-highlight/15 blur-3xl" />
      </div>

      <Link
        href="/"
        className="flex w-fit items-center gap-2 rounded-nav-item focus-visible:outline-2 focus-visible:outline-surface-default"
      >
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-panel bg-surface-default/10 text-brand-accent"
        >
          <Icon name="sparkle" className="size-4" />
        </span>
        <BrandMark as="span" name="product" tone="inverse" />
        <span className="sr-only">: back to the home page</span>
      </Link>

      <div className="hidden flex-col gap-8 desktop:flex">
        <p className="text-display leading-tight font-bold tracking-tight">
          Your paint shop online.{' '}
          <span className="text-brand-accent">
            Your painters and customers in one place.
          </span>
        </p>
        <ul className="flex flex-col gap-4">
          {PROMISES.map((item) => (
            <li
              key={item.text}
              className="flex items-center gap-3 text-body-large text-brand-primary-soft"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-panel bg-surface-default/10 text-brand-accent">
                <Icon name={item.icon} />
              </span>
              {item.text}
            </li>
          ))}
        </ul>
      </div>

      <p className="hidden items-center gap-3 text-body font-semibold text-brand-primary-soft desktop:flex">
        Powered by
        <Image
          src="/brand/zerobyt-logo-light.png"
          alt={BRAND.companyName}
          width={936}
          height={233}
          className="h-6 w-auto"
        />
      </p>
    </aside>
  );
}
