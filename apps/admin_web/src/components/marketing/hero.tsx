import { BRAND } from '@/lib/brand';
import { ButtonLink } from '@/components/ui/button-link';
import { Icon } from '@/components/ui/icon';
import { HeroIllustration } from './illustrations';

export function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="bg-surface-subtle px-4 py-14 desktop:py-20"
    >
      <div className="mx-auto grid w-full max-w-page items-center gap-10 desktop:grid-cols-2">
        <div className="flex flex-col gap-6">
          <p className="text-caption font-semibold tracking-wide text-brand-primary uppercase">
            For paint shops, painters and customers
          </p>
          <h1
            id="hero-heading"
            className="text-heading1 font-bold text-text-primary desktop:text-display"
          >
            Your paint shop online. Your painters and customers in one place.
          </h1>
          <p className="max-w-narrow text-body-large text-text-secondary">
            {BRAND.productName} gives independent paint shops an online
            catalogue, a shop app and an admin portal, and gives painters and
            customers one app to find shops, browse paints and shades, and
            order.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/sign-in">
              Register your shop
              <Icon name="arrowRight" />
            </ButtonLink>
            <ButtonLink href="/sign-in" variant="secondary">
              <Icon name="logIn" />
              Login
            </ButtonLink>
          </div>
          <p className="text-body text-text-secondary">
            Shops register with their mobile number. No app download needed to
            start.
          </p>
        </div>
        <HeroIllustration className="mx-auto max-w-narrow" />
      </div>
    </section>
  );
}
