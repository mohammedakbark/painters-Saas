import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from '@/components/layout/app-shell';
import { NavLinks } from '@/components/layout/nav-links';
import { PageLoading } from '@/components/layout/page-loading';
import { CardLink } from './card';
import { Field } from './field';
import { PageHeader } from './page-header';
import { SegmentedLinks } from './segmented-links';
import { StateMessage } from './state-message';

vi.mock('next/navigation', () => ({
  usePathname: () => '/shops/shop-1/catalogue/shades',
}));

describe('PageHeader', () => {
  it('shows a back link and a caption above the title', () => {
    render(
      <PageHeader
        eyebrow="Overview"
        title="ABC Paints"
        back={{ href: '/shops/shop-1/catalogue', label: 'All products' }}
      />,
    );
    expect(
      screen.getByRole('link', { name: 'All products' }).getAttribute('href'),
    ).toBe('/shops/shop-1/catalogue');
    expect(screen.getByText('Overview')).toBeDefined();
    expect(
      screen.getByRole('heading', { level: 1, name: 'ABC Paints' }),
    ).toBeDefined();
  });
});

describe('SegmentedLinks', () => {
  it('marks the current segment', () => {
    render(
      <SegmentedLinks
        label="Product status"
        segments={[
          { href: '?', label: 'Selling', current: true },
          { href: '?status=ARCHIVED', label: 'Archived', current: false },
        ]}
      />,
    );
    expect(
      screen.getByRole('navigation', { name: 'Product status' }),
    ).toBeDefined();
    expect(
      screen
        .getByRole('link', { name: 'Selling' })
        .getAttribute('aria-current'),
    ).toBe('page');
    expect(
      screen
        .getByRole('link', { name: 'Archived' })
        .getAttribute('aria-current'),
    ).toBeNull();
  });
});

describe('NavLinks', () => {
  it('marks the current section in tabs and shows icons', () => {
    const { container } = render(
      <NavLinks
        label="Catalogue sections"
        orientation="tabs"
        items={[
          {
            href: '/shops/shop-1/catalogue',
            label: 'Products',
            exact: true,
            icon: 'tag',
          },
          {
            href: '/shops/shop-1/catalogue/shades',
            label: 'Shades',
            icon: 'palette',
          },
        ]}
      />,
    );
    expect(
      screen.getByRole('link', { name: 'Shades' }).getAttribute('aria-current'),
    ).toBe('page');
    expect(
      screen
        .getByRole('link', { name: 'Products' })
        .getAttribute('aria-current'),
    ).toBeNull();
    expect(container.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(
      2,
    );
  });
});

describe('AppShell', () => {
  it('shows the area, the way to switch area, the account and sign out', () => {
    render(
      <AppShell
        area={{
          caption: 'Shop',
          name: 'ABC Paints',
          switchTo: { href: '/shops', label: 'All shops' },
        }}
        nav={[
          {
            href: '/shops/shop-1',
            label: 'Overview',
            exact: true,
            icon: 'home',
          },
        ]}
        account="+91 99999 00001"
        signOutAction={async () => {}}
      >
        <p>Content</p>
      </AppShell>,
    );
    expect(screen.getAllByText('ABC Paints').length).toBeGreaterThan(0);
    expect(
      screen
        .getAllByRole('link', { name: /All shops/ })[0]
        ?.getAttribute('href'),
    ).toBe('/shops');
    expect(screen.getByText('+91 99999 00001')).toBeDefined();
    expect(
      screen.getAllByRole('button', { name: 'Sign out' }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole('main').textContent).toBe('Content');
  });
});

describe('Field leadingIcon', () => {
  it('keeps the label and adds a decorative icon', () => {
    const { container } = render(
      <Field label="Search products" name="q" leadingIcon="search" />,
    );
    expect(screen.getByLabelText('Search products').className).toContain(
      'pl-12',
    );
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
  });
});

describe('StateMessage icon', () => {
  it('shows an icon tile above the title', () => {
    const { container } = render(
      <StateMessage icon="tag" title="No products yet" />,
    );
    expect(
      screen.getByRole('heading', { name: 'No products yet' }),
    ).toBeDefined();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});

describe('CardLink variants', () => {
  it('uses the variant classes', () => {
    render(
      <>
        <CardLink href="/a" variant="raised">
          Raised
        </CardLink>
        <CardLink href="/b" variant="dashed">
          Dashed
        </CardLink>
      </>,
    );
    expect(screen.getByRole('link', { name: 'Raised' }).className).toContain(
      'hover:shadow-xl',
    );
    expect(screen.getByRole('link', { name: 'Dashed' }).className).toContain(
      'border-dashed',
    );
  });
});

describe('PageLoading', () => {
  it('is announced as loading', () => {
    const { container } = render(
      <PageLoading label="Loading your catalogue…" />,
    );
    expect(screen.getByText('Loading your catalogue…').className).toContain(
      'sr-only',
    );
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });
});
