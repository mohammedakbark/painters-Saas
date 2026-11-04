import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type {
  CatalogueFormState,
  ImportFormState,
} from '@/lib/catalogue/form-state';
import { catalogueFieldErrors } from '@/lib/catalogue/form-state';
import { BrandCreateForm } from './brand-forms';
import { ImportForm } from './import-form';
import { ProductForm } from './product-form';

const result = (
  overrides: Partial<NonNullable<ImportFormState['result']>> = {},
) => ({
  kind: 'shades' as const,
  dryRun: true,
  applied: false,
  rows: 3,
  created: 2,
  updated: 1,
  unchanged: 0,
  errors: [],
  errorCount: 0,
  ...overrides,
});

describe('catalogueFieldErrors', () => {
  it('maps nested API paths to the top-level form field', () => {
    expect(
      catalogueFieldErrors([
        { path: 'packs.0.quantity', message: 'Too big' },
        { path: 'packs', message: 'Second' },
        { path: 'name', message: 'Enter the name.' },
      ]),
    ).toEqual({ packs: 'Too big', name: 'Enter the name.' });
  });
});

describe('BrandCreateForm', () => {
  it('shows the error and keeps the typed name after a failed save', async () => {
    const action = vi.fn(async (): Promise<CatalogueFormState> => ({
      error: 'A brand named "Demo" already exists.',
      values: { name: 'Demo' },
    }));
    render(<BrandCreateForm action={action} />);
    fireEvent.change(screen.getByLabelText('New brand'), {
      target: { value: 'Demo' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add brand' }));

    expect(
      await screen.findByText('A brand named "Demo" already exists.'),
    ).toBeTruthy();
    expect(screen.getByLabelText('New brand')).toHaveProperty('value', 'Demo');
  });
});

describe('ProductForm', () => {
  const categories = [
    { id: 'c1', name: 'Interior emulsion', active: true },
    { id: 'c2', name: 'Old category', active: false },
  ];

  it('offers active categories (plus the current archived one) and shows field errors', async () => {
    const action = vi.fn(async (): Promise<CatalogueFormState> => ({
      values: {
        name: 'Silk',
        categoryId: 'c1',
        packs: '4 gallons',
        description: '',
        supportsShades: 'on',
      },
      fieldErrors: { packs: '"4 gallons" is not a pack size.' },
    }));
    render(
      <ProductForm
        action={action}
        categories={categories}
        initial={{
          name: '',
          categoryId: 'c2',
          description: '',
          packs: '',
          supportsShades: false,
        }}
        submitLabel="Add product"
        cancelHref="/platform/catalogue"
      />,
    );
    const options = [
      ...(screen.getByLabelText('Category') as HTMLSelectElement).options,
    ].map((option) => option.textContent);
    expect(options).toEqual([
      'Choose the category',
      'Interior emulsion',
      'Old category (archived)',
    ]);

    fireEvent.change(screen.getByLabelText('Pack sizes'), {
      target: { value: '4 gallons' },
    });
    fireEvent.click(screen.getByLabelText('Customers choose a shade'));
    fireEvent.click(screen.getByRole('button', { name: 'Add product' }));
    expect(
      await screen.findByText('"4 gallons" is not a pack size.'),
    ).toBeTruthy();
    expect(screen.getByLabelText('Pack sizes')).toHaveProperty(
      'value',
      '4 gallons',
    );
    expect(screen.getByLabelText('Customers choose a shade')).toHaveProperty(
      'checked',
      true,
    );
  });
});

describe('ImportForm', () => {
  it('allows Import only after a clean check', async () => {
    const action = vi.fn<
      (previous: ImportFormState, data: FormData) => Promise<ImportFormState>
    >(async () => ({ result: result() }));
    render(<ImportForm action={action} />);
    expect(screen.getByRole('button', { name: 'Import' })).toHaveProperty(
      'disabled',
      true,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Check file' }));
    expect(await screen.findByText('The file is ready to import')).toBeTruthy();
    expect(
      screen.getByText(/3 rows: 2 new, 1 changed, 0 unchanged/),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Import' })).toHaveProperty(
      'disabled',
      false,
    );
    expect(action.mock.calls[0]?.[1].get('intent')).toBe('preview');
  });

  it('lists row problems and keeps Import disabled', async () => {
    const action = vi.fn(async (): Promise<ImportFormState> => ({
      result: result({
        errorCount: 2,
        errors: [
          { row: 0, message: 'Missing columns: code.' },
          {
            row: 4,
            message: 'Shade code 1001 appears more than once in the file.',
          },
        ],
      }),
    }));
    render(<ImportForm action={action} />);
    fireEvent.click(screen.getByRole('button', { name: 'Check file' }));

    expect(
      await screen.findByText('2 problems found. Nothing was imported.'),
    ).toBeTruthy();
    expect(screen.getByText('File:')).toBeTruthy();
    expect(screen.getByText('Row 4:')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Import' })).toHaveProperty(
      'disabled',
      true,
    );
  });
});
