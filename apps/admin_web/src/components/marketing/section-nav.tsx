'use client';

import { useEffect, useRef, useState } from 'react';
import { ButtonLink } from '@/components/ui/button-link';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/cn';
import { NAV_LINKS } from './home-content';

/** The id of the section currently in the middle band of the screen. */
function useActiveSection(): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const sections = NAV_LINKS.map((link) =>
      document.getElementById(link.href.slice(1)),
    ).filter((element): element is HTMLElement => element !== null);
    if (sections.length === 0 || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return active;
}

/** Desktop section links; the section being read is highlighted. */
export function SectionNav() {
  const active = useActiveSection();
  return (
    <nav aria-label="Sections" className="hidden desktop:block">
      <ul className="flex gap-1">
        {NAV_LINKS.map((link) => {
          const current = active === link.href.slice(1);
          return (
            <li key={link.href}>
              <a
                href={link.href}
                aria-current={current ? 'location' : undefined}
                className={cn(
                  'relative block rounded-nav-item px-3 py-2 text-body font-medium transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-brand-primary',
                  current
                    ? 'text-brand-primary'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                {link.label}
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-x-3 -bottom-0.5 h-0.5 rounded-badge bg-brand-accent transition-transform duration-300',
                    current ? 'scale-x-100' : 'scale-x-0',
                  )}
                />
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Phone menu with the section links; closes when a link is chosen. */
export function MobileMenu() {
  const menu = useRef<HTMLDetailsElement>(null);
  return (
    <details ref={menu} className="group relative desktop:hidden">
      <summary
        aria-label="Menu"
        className="flex size-12 cursor-pointer list-none items-center justify-center rounded-button text-text-primary hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-brand-primary"
      >
        <Icon name="menu" className="size-6 group-open:hidden" />
        <Icon name="close" className="hidden size-6 group-open:block" />
      </summary>
      <nav
        aria-label="Sections"
        className="absolute right-0 mt-2 w-60 rounded-card border border-card-border bg-card-background p-2 shadow-xl shadow-brand-primary/10"
      >
        <ul className="flex flex-col">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={() => menu.current?.removeAttribute('open')}
                className="block rounded-nav-item px-3 py-3 text-body-large font-medium text-text-primary hover:bg-brand-primary-soft"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-2 border-t border-border-default px-1 pt-3 pb-1">
          <ButtonLink href="/sign-in" variant="secondary" className="w-full">
            <Icon name="logIn" />
            Sign in
          </ButtonLink>
        </div>
      </nav>
    </details>
  );
}
