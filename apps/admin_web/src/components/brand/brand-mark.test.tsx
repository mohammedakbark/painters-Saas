import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BRAND } from '@/lib/brand';
import { BrandMark } from './brand-mark';

describe('BrandMark', () => {
  it('shows the portal name from the generated brand constants', () => {
    render(<BrandMark />);
    expect(screen.getByText(BRAND.adminPortalName).tagName).toBe('P');
  });

  it('can be the page heading', () => {
    render(<BrandMark as="h1" size="heading1" />);
    const heading = screen.getByRole('heading', {
      level: 1,
      name: BRAND.adminPortalName,
    });
    expect(heading.className).toContain('text-heading1');
  });
});
