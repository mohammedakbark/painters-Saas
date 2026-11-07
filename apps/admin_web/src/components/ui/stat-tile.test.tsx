import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { formatCount, StatTile } from './stat-tile';

describe('StatTile', () => {
  it('links to the list behind the number, with a status word', () => {
    render(
      <StatTile
        label="Not available"
        value={8}
        status={{ tone: 'warning', label: 'Customers can’t order' }}
        href="/shops/s/catalogue?show=none"
      />,
    );
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/shops/s/catalogue?show=none');
    expect(link.textContent).toContain('Not available');
    expect(link.textContent).toContain('8');
    expect(link.textContent).toContain('Customers can’t order');
  });

  it('renders without a link and formats large numbers', () => {
    render(<StatTile label="On sale" value={12900} context="3 archived" />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('12.9K')).toBeTruthy();
    expect(formatCount(1284)).toBe('1,284');
  });
});
