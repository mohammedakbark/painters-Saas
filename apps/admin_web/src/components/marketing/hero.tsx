import { BRAND } from '@/lib/brand';
import { ButtonLink } from '@/components/ui/button-link';
import { Icon, type IconName } from '@/components/ui/icon';
import { HeroIllustration } from './illustrations';

const HIGHLIGHTS: readonly { icon: IconName; text: string }[] = [
  { icon: 'smartphone', text: 'Sign in with your mobile number' },
  { icon: 'monitor', text: 'Works on phone and computer' },
  { icon: 'lock', text: 'Your shop’s data stays private' },
];

export function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate overflow-hidden bg-linear-to-b from-brand-primary-soft via-surface-default to-surface-default px-4 pt-14 pb-20 desktop:pt-24 desktop:pb-28"
    >
      {/* Soft colour wash behind the content. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute -top-32 -right-24 size-96 rounded-badge bg-brand-accent/25 blur-3xl" />
        <div className="absolute top-40 -left-32 size-96 rounded-badge bg-brand-primary/15 blur-3xl" />
      </div>

      <div className="mx-auto grid w-full max-w-page items-center gap-14 desktop:grid-cols-[1.1fr_1fr]">
        <div className="reveal flex flex-col items-start gap-7">
          <p className="inline-flex items-center gap-2 rounded-badge border border-brand-primary/15 bg-surface-default/70 px-3 py-1.5 text-caption font-semibold text-brand-primary backdrop-blur-sm">
            <span className="size-2 rounded-badge bg-brand-accent" />
            For paint shops, painters and customers
          </p>
          <h1
            id="hero-heading"
            className="text-display leading-tight font-bold tracking-tight text-text-primary desktop:text-hero"
          >
            Your paint shop online.{' '}
            <span className="bg-linear-to-r from-brand-primary to-brand-primary-strong bg-clip-text text-transparent">
              Your painters and customers in one place.
            </span>
          </h1>
          <p className="max-w-narrow text-body-large leading-relaxed text-text-secondary desktop:text-title desktop:font-normal">
            {BRAND.productName} gives independent paint shops an online
            catalogue, a shop app and an admin portal, and gives painters and
            customers one app to find shops, browse paints and shades, and
            order.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink
              href="/sign-in"
              className="group shadow-lg shadow-brand-primary/25"
            >
              Register your shop
              <Icon
                name="arrowRight"
                className="transition-transform group-hover:translate-x-1"
              />
            </ButtonLink>
            <ButtonLink href="/sign-in" variant="secondary">
              <Icon name="logIn" />
              Login
            </ButtonLink>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {HIGHLIGHTS.map((item) => (
              <li
                key={item.text}
                className="flex items-center gap-2 text-body text-text-secondary"
              >
                <Icon name={item.icon} className="size-4 text-brand-primary" />
                {item.text}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute inset-8 -z-10 rounded-sheet bg-brand-primary/10 blur-2xl"
          />
          <HeroIllustration className="float-slow mx-auto max-w-narrow drop-shadow-xl" />
        </div>
      </div>
    </section>
  );
}
