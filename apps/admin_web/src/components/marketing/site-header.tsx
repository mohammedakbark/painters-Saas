import Link from 'next/link';
import { BrandMark } from '@/components/brand/brand-mark';
import { ButtonLink } from '@/components/ui/button-link';
import { Icon } from '@/components/ui/icon';
import { NAV_LINKS } from './home-content';

/** Public site header: brand, section links (desktop) and Login / Register. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border-default bg-surface-default">
      <div className="mx-auto flex w-full max-w-page items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          className="rounded-nav-item focus-visible:outline-2 focus-visible:outline-brand-primary"
        >
          <BrandMark as="span" name="product" />
        </Link>
        <nav aria-label="Sections" className="hidden desktop:block">
          <ul className="flex gap-6">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-body font-medium text-text-secondary hover:text-brand-primary"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <ButtonLink href="/sign-in" variant="secondary" className="px-4">
            <Icon name="logIn" className="hidden medium:block" />
            Login
          </ButtonLink>
          <ButtonLink href="/sign-in" className="px-4">
            <span>
              Register
              <span className="hidden medium:inline"> your shop</span>
            </span>
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
