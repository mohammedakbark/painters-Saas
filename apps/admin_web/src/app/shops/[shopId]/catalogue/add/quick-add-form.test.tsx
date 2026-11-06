import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QuickAddForm, type QuickAddRow } from './quick-add-form';

const ROWS: QuickAddRow[] = [
  {
    catalogueProductId: 'p1',
    name: 'Silk Emulsion',
    categoryName: 'Interior emulsion',
    packs: [
      { id: 'a', label: '1 L' },
      { id: 'b', label: '4 L' },
    ],
  },
  {
    catalogueProductId: 'p2',
    name: 'Wall Putty',
    categoryName: 'Wall putty',
    packs: [{ id: 'c', label: '20 kg' }],
  },
];

describe('QuickAddForm', () => {
  it('counts the products and pack sizes that have a price', () => {
    render(<QuickAddForm action={vi.fn(async () => ({}))} rows={ROWS} />);
    expect(screen.getByText(/Type a price for each pack size/)).toBeDefined();
    fireEvent.input(screen.getByLabelText('Price of 1 L (₹)'), {
      target: { value: '450' },
    });
    fireEvent.input(screen.getByLabelText('Price of 4 L (₹)'), {
      target: { value: '1450' },
    });
    fireEvent.input(screen.getByLabelText('Price of 20 kg (₹)'), {
      target: { value: '900' },
    });
    expect(screen.getByText(/ready to add/).textContent).toBe(
      '2 products, 3 pack sizes ready to add.',
    );
    expect(
      screen.getByRole('button', { name: 'Add 2 products' }),
    ).toBeDefined();
  });

  it('shows errors next to the fields and keeps the typed prices', async () => {
    const action = vi.fn(async () => ({
      values: { 'price-a': '600', 'mrp-a': '500' },
      fieldErrors: { 'price-a': 'The price cannot be more than the MRP.' },
    }));
    render(<QuickAddForm action={action} rows={ROWS} />);
    fireEvent.input(screen.getByLabelText('Price of 1 L (₹)'), {
      target: { value: '600' },
    });
    await act(async () => {
      fireEvent.submit(
        screen.getByRole('button', { name: 'Add products' }).closest('form')!,
      );
    });
    expect(action).toHaveBeenCalledOnce();
    expect(
      screen.getByText('The price cannot be more than the MRP.'),
    ).toBeDefined();
    expect(
      (screen.getByLabelText('Price of 1 L (₹)') as HTMLInputElement).value,
    ).toBe('600');
  });
});
