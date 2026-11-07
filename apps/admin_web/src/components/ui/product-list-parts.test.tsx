import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PackChip } from './pack-chip';
import { Thumbnail } from './thumbnail';

describe('Thumbnail', () => {
  it('shows the photo, or a labelled placeholder without one', () => {
    const { rerender } = render(
      <Thumbnail
        src="https://cdn.example/p.webp"
        alt="Photo of Silk Emulsion"
      />,
    );
    expect(
      screen
        .getByRole('img', { name: 'Photo of Silk Emulsion' })
        .getAttribute('src'),
    ).toBe('https://cdn.example/p.webp');
    rerender(<Thumbnail src={null} alt="Photo of Wall Putty" />);
    expect(
      screen.getByRole('img', { name: 'Photo of Wall Putty: no photo yet' }),
    ).toBeDefined();
  });
});

describe('PackChip', () => {
  it('shows size and price, and says when a size is not available', () => {
    const { container } = render(
      <>
        <PackChip label="1 L" price="₹450" available />
        <PackChip label="4 L" price="₹1,950" available={false} />
      </>,
    );
    const [available, notAvailable] =
      container.querySelectorAll(':scope > span');
    expect(available!.textContent).toBe('1 L·₹450');
    expect(notAvailable!.textContent).toBe('4 L·₹1,950, not available');
    expect(notAvailable!.className).toContain('bg-status-warning-soft');
    expect(available!.className).not.toContain('warning');
  });
});
