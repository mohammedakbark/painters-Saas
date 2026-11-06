import Link from 'next/link';
import { BRAND } from '@/lib/brand';
import { ButtonLink } from '@/components/ui/button-link';
import { Icon, type IconName } from '@/components/ui/icon';
import { HeroIllustration } from './illustrations';

const HIGHLIGHTS: readonly { icon: IconName; text: string }[] = [
  { icon: 'smartphone', text: 'Sign in with your mobile number' },
  { icon: 'monitor', text: 'Works on phone and computer' },
  { icon: 'lock', text: "Your shop's data stays private" },
];

export function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate overflow-hidden bg-linear-to-br from-brand-primary to-brand-primary-strong px-4 pt-14 pb-20 desktop:pt-24 desktop:pb-28"
    >
      {/* Soft colour wash and a dotted grid, as on the brand poster. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute -top-32 -right-24 size-96 rounded-badge bg-brand-accent/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-32 size-96 rounded-badge bg-brand-highlight/15 blur-3xl" />
        <div className="absolute top-10 right-10 hidden size-40 bg-[radial-gradient(var(--color-brand-primary-soft)_1.5px,transparent_1.5px)] bg-size-[20px_20px] opacity-30 desktop:block" />
      </div>

      <div className="mx-auto grid w-full max-w-page items-center gap-14 desktop:grid-cols-[1.1fr_1fr]">
        <div className="reveal flex flex-col items-start gap-7">
          <p className="inline-flex items-center gap-2 rounded-badge border border-surface-default/20 bg-surface-default/10 px-3 py-1.5 text-caption font-semibold tracking-wide text-surface-default uppercase backdrop-blur-sm">
            <span className="size-2 rounded-badge bg-brand-highlight" />
            For paint shops, painters and customers
          </p>
          <h1
            id="hero-heading"
            className="text-display leading-tight font-bold tracking-tight text-surface-default desktop:text-hero"
          >
            Your paint shop online.{' '}
            <span className="relative inline text-brand-accent">
              Your painters and customers in one place.
            </span>
          </h1>
          <span
            aria-hidden="true"
            className="-mt-4 block h-1.5 w-40 rounded-badge bg-brand-highlight desktop:w-64"
          />
          <p className="max-w-narrow text-body-large leading-relaxed text-brand-primary-soft desktop:text-title desktop:font-normal">
            {BRAND.productName} gives independent paint shops an online
            catalogue, a shop app and an admin portal, and gives painters and
            customers one app to find shops, browse paints and shades, and
            order.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink
              href="/register"
              variant="secondary"
              className="group shadow-lg shadow-brand-primary-strong/40"
            >
              Register your shop
              <Icon
                name="arrowRight"
                className="transition-transform group-hover:translate-x-1"
              />
            </ButtonLink>
            <Link
              href="/sign-in"
              className="inline-flex min-h-control items-center gap-2 rounded-button px-3 text-body-large font-semibold text-surface-default underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-surface-default"
            >
              <Icon name="logIn" />
              Sign in
            </Link>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {HIGHLIGHTS.map((item) => (
              <li
                key={item.text}
                className="flex items-center gap-2 text-body text-brand-primary-soft"
              >
                <Icon name={item.icon} className="size-4 text-brand-accent" />
                {item.text}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute inset-8 -z-10 rounded-sheet bg-brand-accent/15 blur-2xl"
          />
          <HeroIllustration className="float-slow mx-auto max-w-narrow drop-shadow-2xl" />
        </div>
      </div>
    </section>
  );
}
