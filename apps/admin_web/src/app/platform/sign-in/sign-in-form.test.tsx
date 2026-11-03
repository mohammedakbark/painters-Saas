import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SignInFormState } from '@/lib/auth/sign-in';
import { SignInForm } from './sign-in-form';

describe('SignInForm', () => {
  it('renders labelled fields and a sign-in button', () => {
    render(<SignInForm action={vi.fn()} />);

    expect(screen.getByLabelText('Email').getAttribute('autocomplete')).toBe(
      'username',
    );
    expect(screen.getByLabelText('Password').getAttribute('type')).toBe(
      'password',
    );
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDefined();
  });

  it('shows the form error and keeps the email after a failed attempt', async () => {
    const action = vi.fn(
      (
        _previous: SignInFormState,
        formData: FormData,
      ): Promise<SignInFormState> =>
        Promise.resolve({
          email: String(formData.get('email')),
          formError: 'Email or password is incorrect.',
        }),
    );
    render(<SignInForm action={action} />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'admin@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Email or password is incorrect.');
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe(
      'admin@example.com',
    );
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('shows field errors next to their inputs', async () => {
    const action = vi.fn((): Promise<SignInFormState> =>
      Promise.resolve({
        email: '',
        fieldErrors: {
          email: 'Enter your email address.',
          password: 'Enter your password.',
        },
      }),
    );
    render(<SignInForm action={action} />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter your email address.')).toBeDefined();
    expect(
      screen.getByLabelText('Password').getAttribute('aria-describedby'),
    ).toBe('field-password-error');
  });
});
