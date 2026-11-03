import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RegisterShopFormState } from '@/lib/shops/register';
import { RegisterShopForm } from './register-shop-form';

describe('RegisterShopForm', () => {
  it('asks for the shop name and the owner name', () => {
    render(<RegisterShopForm action={vi.fn()} />);

    expect(screen.getByLabelText('Shop name')).toBeDefined();
    expect(screen.getByLabelText('Your name')).toBeDefined();
    expect(
      screen.getByRole('link', { name: 'Cancel' }).getAttribute('href'),
    ).toBe('/shops');
  });

  it('shows field errors inline and keeps the typed values', async () => {
    const action = vi.fn(
      (
        _previous: RegisterShopFormState,
        formData: FormData,
      ): Promise<RegisterShopFormState> =>
        Promise.resolve({
          values: {
            shopName: String(formData.get('shopName')),
            ownerName: String(formData.get('ownerName')),
          },
          fieldErrors: {
            shopName: 'The shop name must be at least 2 characters.',
          },
        }),
    );
    render(<RegisterShopForm action={action} />);

    fireEvent.change(screen.getByLabelText('Shop name'), {
      target: { value: 'L' },
    });
    fireEvent.change(screen.getByLabelText('Your name'), {
      target: { value: 'Anil Kumar' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Register shop' }));

    expect(
      await screen.findByText('The shop name must be at least 2 characters.'),
    ).toBeDefined();
    expect((screen.getByLabelText('Your name') as HTMLInputElement).value).toBe(
      'Anil Kumar',
    );
  });

  it('shows a form-level error from the API', async () => {
    const action = vi.fn((): Promise<RegisterShopFormState> =>
      Promise.resolve({
        values: { shopName: 'Lakshmi Paints', ownerName: 'Anil' },
        formError: 'Sign in with your mobile number to register a shop.',
      }),
    );
    render(<RegisterShopForm action={action} />);

    fireEvent.click(screen.getByRole('button', { name: 'Register shop' }));

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Sign in with your mobile number',
    );
  });
});
