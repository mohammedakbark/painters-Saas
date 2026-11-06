import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BRAND } from '@/lib/brand';
import { BrandMark } from './brand-mark';

describe('BrandMark', () => {
  it('names the portal for screen readers and shows the fan', () => {
    const { container } = render(<BrandMark />);

    expect(screen.getByText(BRAND.adminPortalName).className).toContain(
      'sr-only',
    );
    expect(container.querySelectorAll('svg rect')).toHaveLength(7);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
  });

  it('can be the page heading', () => {
    render(<BrandMark as="h1" size="heading1" />);
    const heading = screen.getByRole('heading', {
      level: 1,
      name: BRAND.adminPortalName,
    });
    expect(heading.className).toContain('text-heading1');
  });

  it('shows the product name on public pages', () => {
    render(<BrandMark name="product" />);
    expect(screen.getByText(BRAND.productName)).toBeDefined();
    expect(screen.queryByText('Admin')).toBeNull();
  });

  it('uses the on-dark colours when inverse', () => {
    const { container } = render(<BrandMark name="product" tone="inverse" />);
    expect(container.querySelector('circle')?.getAttribute('class')).toBe(
      'fill-logo-teal-light',
    );
  });
});
