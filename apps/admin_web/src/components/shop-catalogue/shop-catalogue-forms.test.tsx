import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CatalogueFormState } from '@/lib/catalogue/form-state';
import {
  ActionButtonForm,
  AddPackForm,
  CatalogueListingForm,
  OwnProductForm,
  PackRowForm,
} from './shop-catalogue-forms';

const packs = [
  { id: 'p1', label: '1 L' },
  { id: 'p2', label: '4 L' },
];

describe('CatalogueListingForm', () => {
  it('ticks every pack size as sold and available by default', () => {
    render(
      <CatalogueListingForm
        action={vi.fn(async () => ({}))}
        packs={packs}
        cancelHref="/back"
      />,
    );
    expect(screen.getByLabelText('Sell 1 L')).toHaveProperty('checked', true);
    expect(screen.getByLabelText('Sell 4 L')).toHaveProperty('checked', true);
    expect(screen.getByLabelText('Price of 4 L (₹)')).toBeTruthy();
    expect(screen.getAllByLabelText('Available')).toHaveLength(2);
  });

  it('keeps the rows and shows the error next to the price after a failed add', async () => {
    const action = vi.fn(
      async (
        _previous: CatalogueFormState,
        formData: FormData,
      ): Promise<CatalogueFormState> => ({
        values: Object.fromEntries(
          [...formData.entries()].map(([k, v]) => [k, String(v)]),
        ),
        fieldErrors: { 'price-p1': 'The price cannot be more than the MRP.' },
      }),
    );
    render(
      <CatalogueListingForm action={action} packs={packs} cancelHref="/back" />,
    );
    fireEvent.click(screen.getByLabelText('Sell 4 L'));
    fireEvent.change(screen.getByLabelText('MRP of 1 L (₹, optional)'), {
      target: { value: '100' },
    });
    fireEvent.change(screen.getByLabelText('Price of 1 L (₹)'), {
      target: { value: '120' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Add to my catalogue' }),
    );

    expect(
      await screen.findByText('The price cannot be more than the MRP.'),
    ).toBeTruthy();
    const sent = action.mock.calls[0][1];
    expect(sent.get('sell-p1')).toBe('on');
    expect(sent.get('sell-p2')).toBeNull();
    expect(screen.getByLabelText('Sell 4 L')).toHaveProperty('checked', false);
    expect(screen.getByLabelText('Price of 1 L (₹)')).toHaveProperty(
      'value',
      '120',
    );
  });
});

describe('OwnProductForm', () => {
  it('offers categories and brands and shows blank pack rows when adding', () => {
    render(
      <OwnProductForm
        action={vi.fn(async () => ({}))}
        categories={[{ id: 'c1', name: 'Putty' }]}
        brands={[{ id: 'b1', name: 'Sample Paints' }]}
        initial={{
          name: '',
          categoryId: '',
          brandId: '',
          brandName: '',
          description: '',
          supportsShades: false,
        }}
        withPacks
        submitLabel="Add product"
      />,
    );
    expect(screen.getByRole('option', { name: 'Putty' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Sample Paints' })).toBeTruthy();
    expect(screen.getByLabelText('Pack size 1 (L)')).toBeTruthy();
    expect(screen.getByLabelText('Pack size 4 (L)')).toBeTruthy();
    // "Sold by" changes the unit of every row (CAT-005).
    fireEvent.click(screen.getByLabelText('Kilograms'));
    expect(screen.getByLabelText('Pack size 1 (kg)')).toBeTruthy();
    expect(screen.getByLabelText('Product photo (optional)')).toBeTruthy();
  });

  it('shows details only, read-only, for members who cannot edit', () => {
    render(
      <OwnProductForm
        action={vi.fn(async () => ({}))}
        categories={[{ id: 'c1', name: 'Putty' }]}
        brands={[]}
        initial={{
          name: 'Wall Putty',
          categoryId: 'c1',
          brandId: '',
          brandName: 'Local',
          description: '',
          supportsShades: false,
        }}
        withPacks={false}
        submitLabel="Save details"
        disabled
      />,
    );
    expect(screen.getByLabelText('Product name')).toHaveProperty(
      'disabled',
      true,
    );
    expect(screen.queryByLabelText('Pack size 1')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save details' })).toBeNull();
  });
});

describe('PackRowForm', () => {
  it('shows the stored rupee values and the saved status', async () => {
    const action = vi.fn(async (): Promise<CatalogueFormState> => ({
      saved: 'Saved.',
    }));
    render(
      <PackRowForm
        action={action}
        pack={{
          id: 'p1',
          label: '4 L',
          mrp: '1500',
          price: '1450.50',
          available: false,
        }}
      />,
    );
    expect(screen.getByLabelText('Price of 4 L (₹)')).toHaveProperty(
      'value',
      '1450.50',
    );
    expect(screen.getByLabelText('Available')).toHaveProperty('checked', false);
    fireEvent.click(screen.getByRole('button', { name: 'Save 4 L' }));
    expect(await screen.findByText('Saved.')).toBeTruthy();
  });
});

describe('AddPackForm', () => {
  it('offers the brand sizes for catalogue products and a typed size for own products', () => {
    const { unmount } = render(
      <AddPackForm
        action={vi.fn(async () => ({}))}
        cataloguePacks={[{ id: 'p3', label: '20 L' }]}
      />,
    );
    expect(screen.getByRole('option', { name: '20 L' })).toBeTruthy();
    unmount();
    render(
      <AddPackForm action={vi.fn(async () => ({}))} cataloguePacks={null} />,
    );
    expect(screen.getByLabelText('Pack size')).toHaveProperty(
      'tagName',
      'INPUT',
    );
  });
});

describe('ActionButtonForm', () => {
  it('names the target for screen readers and shows an error', async () => {
    render(
      <ActionButtonForm
        action={vi.fn(async () => ({
          error: 'Only the shop owner can change the catalogue.',
        }))}
        label="Remove"
        pendingLabel="Removing…"
        accessibleLabel="Remove pack size 4 L"
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove pack size 4 L' }),
    );
    expect(
      await screen.findByText('Only the shop owner can change the catalogue.'),
    ).toBeTruthy();
  });
});
