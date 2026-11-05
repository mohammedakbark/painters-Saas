import Link from 'next/link';
import type { ReactNode } from 'react';
import { BrandMark } from '@/components/brand/brand-mark';
import { BRAND } from '@/lib/brand';
import { cn } from '@/lib/cn';
import {
  COMPANY_LINKS,
  COMPANY_URL,
  LEGAL_LINKS,
  type SiteLink,
  SOCIAL_LINKS,
} from '@/lib/site-links';
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

/** A footer link, or a disabled "coming soon" placeholder without a URL. */
function FooterLink({ link }: { link: SiteLink }) {
  const classes =
    'text-body text-brand-primary-soft underline-offset-4 focus-visible:outline-2 focus-visible:outline-surface-default';
  if (link.href) {
    return (
      <a
        href={link.href}
        className={cn(classes, 'hover:text-surface-default hover:underline')}
      >
        {link.label}
      </a>
    );
  }
  return (
    <span
      role="link"
      aria-disabled="true"
      title="Coming soon"
      className={cn(classes, 'cursor-not-allowed')}
    >
      {link.label}
      <span className="sr-only"> (coming soon)</span>
    </span>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-caption font-semibold tracking-wide text-brand-accent uppercase">
        {title}
      </h2>
      <ul className="flex flex-col gap-3">{children}</ul>
    </div>
  );
}

function SocialButtons() {
  return (
    <ul className="flex gap-3" aria-label="Follow us">
      {SOCIAL_LINKS.map((link) => {
        const classes =
          'flex size-11 items-center justify-center rounded-button border border-surface-default/20 bg-surface-default/10 text-surface-default transition-colors focus-visible:outline-2 focus-visible:outline-surface-default';
        return (
          <li key={link.label}>
            {link.href ? (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.label}
                className={cn(
                  classes,
                  'hover:bg-brand-accent hover:text-text-primary',
                )}
              >
                <Icon name={link.icon} />
              </a>
            ) : (
              <span
                role="link"
                aria-disabled="true"
                aria-label={`${link.label}: coming soon`}
                title="Coming soon"
                className={cn(classes, 'cursor-not-allowed')}
              >
                <Icon name={link.icon} />
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** "Powered by zero.byt": the company behind the product. */
function PoweredBy() {
  const chip = (
    <span className="rounded-button bg-surface-default px-4 py-1.5 text-title font-bold tracking-tight text-text-primary">
      {BRAND.companyName}
    </span>
  );
  return (
    <p className="inline-flex flex-wrap items-center gap-3 rounded-button border border-surface-default/15 bg-surface-default/5 py-2 pr-4 pl-5 text-body font-semibold text-brand-primary-soft">
      Powered by
      {COMPANY_URL ? (
        <a
          href={COMPANY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-button focus-visible:outline-2 focus-visible:outline-surface-default"
        >
          {chip}
        </a>
      ) : (
        chip
      )}
      <span className="text-surface-default">{BRAND.companyHandle}</span>
    </p>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-brand-primary-strong px-4 pt-16 pb-10">
      <div className="mx-auto flex w-full max-w-page flex-col gap-12">
        <div className="grid gap-10 medium:grid-cols-2 desktop:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="flex size-8 items-center justify-center rounded-panel bg-surface-default/10 text-brand-accent"
              >
                <Icon name="sparkle" className="size-4" />
              </span>
              <BrandMark name="product" tone="inverse" />
            </div>
            <p className="max-w-form text-body text-brand-primary-soft">
              For independent paint shops, painters and customers. Your shop,
              your painters, your customers: connected.
            </p>
            <SocialButtons />
          </div>
          <FooterColumn title="Product">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-body text-brand-primary-soft underline-offset-4 hover:text-surface-default hover:underline"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </FooterColumn>
          <FooterColumn title="Company">
            {COMPANY_LINKS.map((link) => (
              <li key={link.label}>
                <FooterLink link={link} />
              </li>
            ))}
          </FooterColumn>
          <FooterColumn title="Legal">
            {LEGAL_LINKS.map((link) => (
              <li key={link.label}>
                <FooterLink link={link} />
              </li>
            ))}
          </FooterColumn>
        </div>
        <div className="flex flex-col items-start gap-4 border-t border-surface-default/15 pt-8 desktop:flex-row desktop:items-center desktop:justify-between">
          <PoweredBy />
          <p className="text-body text-brand-primary-soft">
            A product of {BRAND.companyName}.
          </p>
        </div>
      </div>
    </footer>
  );
}
