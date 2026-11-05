import Link from 'next/link';
import { BrandMark } from '@/components/brand/brand-mark';
import { ButtonLink } from '@/components/ui/button-link';
import { Icon } from '@/components/ui/icon';
import { MobileMenu, SectionNav } from './section-nav';

/**
 * Public site header: brand, section links, Login and Register. It is
 * translucent at the top and gains a shadow and a progress bar as the page
 * scrolls (CSS scroll-driven, see globals.css).
 */
export function SiteHeader() {
  return (
    <header className="header-elevate sticky top-0 z-20 border-b border-transparent bg-surface-default/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-page items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-nav-item focus-visible:outline-2 focus-visible:outline-brand-primary"
        >
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-panel bg-linear-to-br from-brand-primary to-brand-primary-strong text-brand-accent"
          >
            <Icon name="sparkle" className="size-4" />
          </span>
          <BrandMark as="span" name="product" />
        </Link>
        <SectionNav />
        <div className="flex items-center gap-2">
          <div className="hidden medium:block">
            <ButtonLink href="/sign-in" variant="secondary" className="px-4">
              <Icon name="logIn" />
              Login
            </ButtonLink>
          </div>
          <ButtonLink href="/sign-in" className="px-4">
            <span>
              Register
              <span className="hidden medium:inline"> your shop</span>
            </span>
          </ButtonLink>
          <MobileMenu />
        </div>
      </div>
      <div
        aria-hidden="true"
        className="scroll-progress absolute inset-x-0 bottom-0 h-0.5 bg-linear-to-r from-brand-primary to-brand-accent"
      />
    </header>
  );
}
