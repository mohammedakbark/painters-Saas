import Link from 'next/link';
import { BrandMark } from '@/components/brand/brand-mark';
import { ButtonLink } from '@/components/ui/button-link';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { FAQS, NAV_LINKS } from './home-content';
import { MarketingSection } from './section';

export function FaqSection() {
  return (
    <MarketingSection
      id="faq"
      eyebrow="Questions"
      title="Questions shops ask"
      tone="subtle"
    >
      <div className="flex max-w-content flex-col gap-3">
        {FAQS.map((faq) => (
          <Card
            as="details"
            key={faq.question}
            className="reveal group p-5 transition-[border-color] open:border-brand-primary/30"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-title font-semibold text-text-primary">
              {faq.question}
              <Icon
                name="chevronDown"
                className="text-brand-primary transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="mt-3 text-body-large text-text-secondary">
              {faq.answer}
            </p>
          </Card>
        ))}
      </div>
    </MarketingSection>
  );
}

/** Closing call to action: a brand-colour panel with a soft glow. */
export function FinalCta() {
  return (
    <section
      aria-labelledby="cta-heading"
      className="bg-surface-subtle px-4 pb-20 desktop:pb-28"
    >
      <div className="reveal relative isolate mx-auto w-full max-w-page overflow-hidden rounded-sheet bg-linear-to-br from-brand-primary to-brand-primary-strong px-6 py-14 shadow-2xl shadow-brand-primary/30 desktop:px-16 desktop:py-20">
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <div className="absolute -top-24 -right-16 size-80 rounded-badge bg-brand-accent/30 blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 size-80 rounded-badge bg-surface-default/10 blur-3xl" />
        </div>
        <div className="flex flex-col items-start gap-8 desktop:flex-row desktop:items-center desktop:justify-between">
          <div className="flex max-w-narrow flex-col gap-3">
            <h2
              id="cta-heading"
              className="text-heading1 font-bold tracking-tight text-surface-default desktop:text-display"
            >
              Bring your paint shop online
            </h2>
            <p className="text-body-large text-brand-primary-soft">
              Register with your mobile number and set up your shop today.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/sign-in" variant="secondary" className="group">
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
              Login
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border-default bg-surface-default px-4 py-10">
      <div className="mx-auto flex w-full max-w-page flex-col gap-6 desktop:flex-row desktop:items-center desktop:justify-between">
        <div className="flex flex-col gap-1">
          <BrandMark name="product" />
          <p className="text-body text-text-secondary">
            For independent paint shops, painters and customers.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-body text-text-secondary hover:text-brand-primary"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
