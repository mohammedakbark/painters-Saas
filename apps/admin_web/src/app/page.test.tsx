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
    // Login: the desktop button and the phone menu.
    const logins = within(header).getAllByRole('link', { name: 'Login' });
    expect(logins).toHaveLength(2);
    for (const link of logins) {
      expect(link.getAttribute('href')).toBe('/sign-in');
    }
    expect(
      within(header)
        .getByRole('link', { name: /^Register/ })
        .getAttribute('href'),
    ).toBe('/sign-in');
  });

  it('links every header section to a section on the page', () => {
    const { container } = render(<Home />);
    const header = screen.getByRole('banner');

    const anchors = within(header)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href') ?? '')
      .filter((href) => href.startsWith('#'));
    expect(anchors.length).toBeGreaterThan(0);
    for (const href of anchors) {
      expect(container.querySelector(href)).not.toBeNull();
    }
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

    const storeButtons = screen.getAllByRole('link', {
      name: /(App Store|Google Play): coming soon/,
    });
    expect(storeButtons).toHaveLength(4);
    for (const button of storeButtons) {
      expect(button.getAttribute('aria-disabled')).toBe('true');
      expect(button.getAttribute('href')).toBeNull();
    }
  });

  it('shows footer links as placeholders and credits zero.byt', () => {
    render(<Home />);
    const footer = screen.getByRole('contentinfo');

    for (const name of [
      /^Privacy policy/,
      /^Terms of use/,
      /^About us/,
      /^Contact us/,
      /^WhatsApp/,
      /^Instagram/,
      /^LinkedIn/,
    ]) {
      const link = within(footer).getByRole('link', { name });
      expect(link.getAttribute('aria-disabled')).toBe('true');
      expect(link.getAttribute('href')).toBeNull();
    }
    expect(
      within(footer).getByText('Powered by', { exact: false }),
    ).toBeDefined();
    expect(
      within(footer).getAllByText(BRAND.companyName).length,
    ).toBeGreaterThan(0);
    expect(within(footer).getByText(BRAND.companyHandle)).toBeDefined();
  });
});
