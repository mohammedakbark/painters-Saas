import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Combobox } from './combobox';

describe('Combobox', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function setup() {
    const onSelect = vi.fn();
    const onCreate = vi.fn();
    const search = vi.fn(async () => [
      {
        id: 'p1',
        title: 'Silk Emulsion',
        detail: 'Demo Paints · 1 L, 4 L',
        note: 'In your products',
      },
      { id: 'p2', title: 'Silk Primer', detail: 'Other Paints · 4 L' },
    ]);
    render(
      <Combobox
        label="Find the product"
        search={search}
        onSelect={onSelect}
        onCreate={onCreate}
        createLabel={(text) => `Add "${text}" as a new product`}
      />,
    );
    const input = screen.getByRole('combobox', { name: 'Find the product' });
    return { input, search, onSelect, onCreate };
  }

  async function typeText(input: HTMLElement, value: string) {
    fireEvent.change(input, { target: { value } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });
  }

  it('searches after typing and picks an option with the keyboard', async () => {
    const { input, search, onSelect } = setup();
    await typeText(input, 's');
    expect(search).not.toHaveBeenCalled();
    await typeText(input, 'silk');
    expect(search).toHaveBeenCalledWith('silk');
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.getByText('In your products')).toBeDefined();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'p2' }),
    );
  });

  it('always offers to add what was typed as a new product', async () => {
    const { input, onCreate } = setup();
    await typeText(input, 'Asian Ace Primer');
    fireEvent.click(
      screen.getByRole('option', {
        name: 'Add "Asian Ace Primer" as a new product',
      }),
    );
    expect(onCreate).toHaveBeenCalledWith('Asian Ace Primer');
  });
});
