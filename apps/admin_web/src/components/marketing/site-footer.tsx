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
          <Card as="details" key={faq.question} className="group p-5">
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

/** Closing call to action on the brand colour. */
export function FinalCta() {
  return (
    <section
      aria-labelledby="cta-heading"
      className="bg-brand-primary px-4 py-16"
    >
      <div className="mx-auto flex w-full max-w-page flex-col items-start gap-6 desktop:flex-row desktop:items-center desktop:justify-between">
        <div className="flex flex-col gap-2">
          <h2
            id="cta-heading"
            className="text-heading2 font-semibold text-surface-default"
          >
            Bring your paint shop online
          </h2>
          <p className="text-body-large text-surface-default">
            Register with your mobile number and set up your shop today.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/sign-in" variant="secondary">
            Register your shop
            <Icon name="arrowRight" />
          </ButtonLink>
          <ButtonLink href="/sign-in" className="border border-surface-default">
            <Icon name="logIn" />
            Login
          </ButtonLink>
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
