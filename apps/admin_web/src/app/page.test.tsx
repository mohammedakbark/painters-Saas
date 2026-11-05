import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BRAND } from '@/lib/brand';
import Home from './page';

describe('Home page', () => {
  it('explains the platform with one main heading', () => {
    render(<Home />);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const products = screen.getByRole('region', {
      name: 'One platform, three ways in',
    });
    for (const name of ['Customer App', 'Shop App', 'Shop Admin portal']) {
      expect(
        within(products).getByRole('heading', { level: 3, name }),
      ).toBeDefined();
    }
    expect(screen.getByRole('heading', { name: 'Our vision' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Our mission' })).toBeDefined();
  });

  it('leads shops to Login and Register in the header', () => {
    render(<Home />);
    const header = screen.getByRole('banner');

    expect(within(header).getByText(BRAND.productName)).toBeDefined();
    expect(
      within(header).getByRole('link', { name: 'Login' }).getAttribute('href'),
    ).toBe('/sign-in');
    expect(
      within(header)
        .getByRole('link', { name: /^Register/ })
        .getAttribute('href'),
    ).toBe('/sign-in');
  });

  it('does not offer the platform admin sign-in', () => {
    render(<Home />);

    const hrefs = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href') ?? '');
    expect(hrefs.some((href) => href.startsWith('/platform'))).toBe(false);
    expect(screen.queryByText(/platform admin/i)).toBeNull();
  });

  it('shows the unpublished store buttons as coming soon', () => {
    render(<Home />);

    const storeButtons = screen.getAllByRole('link', { name: /coming soon/ });
    expect(storeButtons).toHaveLength(4);
    for (const button of storeButtons) {
      expect(button.getAttribute('aria-disabled')).toBe('true');
      expect(button.getAttribute('href')).toBeNull();
    }
  });
});
