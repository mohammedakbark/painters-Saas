import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RowActions } from './row-actions';

function setup({
  availableCount = 2,
  packCount = 3,
  archived = false,
}: { availableCount?: number; packCount?: number; archived?: boolean } = {}) {
  const markAllAvailable = vi.fn(async () => ({}));
  const markAllNotAvailable = vi.fn(async () => ({}));
  const setArchived = vi.fn(async () => ({}));
  render(
    <RowActions
      productName="Silk Emulsion"
      editHref="/shops/s/catalogue/products/p"
      availableCount={availableCount}
      packCount={packCount}
      archived={archived}
      markAllAvailable={markAllAvailable}
      markAllNotAvailable={markAllNotAvailable}
      setArchived={setArchived}
    />,
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Actions for Silk Emulsion' }),
  );
  return { markAllAvailable, markAllNotAvailable, setArchived };
}

describe('RowActions', () => {
  it('links to the product and offers both "mark all" actions when some sizes are not available', async () => {
    const { markAllAvailable } = setup();
    expect(
      screen
        .getByRole('menuitem', { name: 'Edit prices and details' })
        .getAttribute('href'),
    ).toBe('/shops/s/catalogue/products/p');
    expect(
      screen.getByRole('menuitem', { name: 'Mark all sizes not available' }),
    ).toBeDefined();
    await act(async () => {
      fireEvent.click(
        screen.getByRole('menuitem', { name: 'Mark all sizes available' }),
      );
    });
    expect(markAllAvailable).toHaveBeenCalledOnce();
  });

  it('only offers what changes something', () => {
    setup({ availableCount: 1, packCount: 1 });
    expect(
      screen.getByRole('menuitem', { name: 'Mark not available' }),
    ).toBeDefined();
    expect(
      screen.queryByRole('menuitem', { name: /^Mark available/ }),
    ).toBeNull();
  });

  it('asks before archiving, and only archives on confirm', async () => {
    const { setArchived } = setup();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Archive product' }));
    expect(setArchived).not.toHaveBeenCalled();
    expect(screen.getByText('Archive this product?')).toBeDefined();
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Archive product', hidden: true }),
      );
    });
    expect(setArchived).toHaveBeenCalledOnce();
  });

  it('offers Restore, without availability, for an archived product', () => {
    setup({ archived: true });
    expect(
      screen.getByRole('menuitem', { name: 'Restore product' }),
    ).toBeDefined();
    expect(screen.queryByRole('menuitem', { name: /available/ })).toBeNull();
  });
});
