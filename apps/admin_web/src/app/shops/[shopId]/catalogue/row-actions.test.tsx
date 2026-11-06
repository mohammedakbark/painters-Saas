import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RowActions } from './row-actions';

function setup(archived = false) {
  const toggleAvailable = vi.fn(async () => ({}));
  const setArchived = vi.fn(async () => ({}));
  render(
    <RowActions
      productName="Silk Emulsion"
      sizeLabel="4 L"
      editHref="/shops/s/catalogue/products/p"
      available
      archived={archived}
      toggleAvailable={toggleAvailable}
      setArchived={setArchived}
    />,
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Actions for Silk Emulsion 4 L' }),
  );
  return { toggleAvailable, setArchived };
}

describe('RowActions', () => {
  it('links to the product and marks the pack not available', async () => {
    const { toggleAvailable } = setup();
    expect(
      screen
        .getByRole('menuitem', { name: 'Edit prices and details' })
        .getAttribute('href'),
    ).toBe('/shops/s/catalogue/products/p');
    await act(async () => {
      fireEvent.click(
        screen.getByRole('menuitem', { name: 'Mark not available' }),
      );
    });
    expect(toggleAvailable).toHaveBeenCalledOnce();
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
    setup(true);
    expect(
      screen.getByRole('menuitem', { name: 'Restore product' }),
    ).toBeDefined();
    expect(screen.queryByRole('menuitem', { name: /available/ })).toBeNull();
  });
});
