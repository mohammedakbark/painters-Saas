import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OtpFormState } from '@/lib/auth/otp';
import { OtpSignInForm } from './otp-sign-in-form';

describe('OtpSignInForm', () => {
  it('starts with the mobile number step', () => {
    render(<OtpSignInForm action={vi.fn()} />);

    expect(screen.getByLabelText('Mobile number').getAttribute('type')).toBe(
      'tel',
    );
    expect(screen.getByRole('button', { name: 'Send code' })).toBeDefined();
    expect(screen.queryByLabelText('6-digit code')).toBeNull();
  });

  it('moves to the code step and says where the code was sent', async () => {
    const action = vi.fn(
      (_previous: OtpFormState, formData: FormData): Promise<OtpFormState> => {
        expect(formData.get('intent')).toBe('request');
        return Promise.resolve({
          step: 'code',
          phone: '+919999900001',
          notice: 'We sent a 6-digit code to +91 99999 00001.',
        });
      },
    );
    render(<OtpSignInForm action={action} />);

    fireEvent.change(screen.getByLabelText('Mobile number'), {
      target: { value: '99999 00001' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));

    const code = await screen.findByLabelText('6-digit code');
    expect(code.getAttribute('autocomplete')).toBe('one-time-code');
    expect(screen.getByRole('status').textContent).toContain('+91 99999 00001');
    expect(
      screen.getByRole('button', { name: 'Use a different number' }),
    ).toBeDefined();
  });

  it('shows the phone error next to the field', async () => {
    const action = vi.fn((): Promise<OtpFormState> =>
      Promise.resolve({
        step: 'phone',
        phoneInput: '123',
        error: 'Enter a 10-digit Indian mobile number.',
      }),
    );
    render(<OtpSignInForm action={action} />);

    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));

    expect(
      await screen.findByText('Enter a 10-digit Indian mobile number.'),
    ).toBeDefined();
    expect(
      screen.getByLabelText('Mobile number').getAttribute('aria-invalid'),
    ).toBe('true');
  });

  it('keeps the number in a hidden field and shows code errors', async () => {
    let calls = 0;
    const action = vi.fn(
      (_previous: OtpFormState, formData: FormData): Promise<OtpFormState> => {
        calls += 1;
        if (calls === 1) {
          return Promise.resolve({ step: 'code', phone: '+919999900001' });
        }
        expect(formData.get('intent')).toBe('verify');
        expect(formData.get('phone')).toBe('+919999900001');
        return Promise.resolve({
          step: 'code',
          phone: '+919999900001',
          error: 'That code is incorrect or has expired.',
        });
      },
    );
    render(<OtpSignInForm action={action} />);

    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
    fireEvent.change(await screen.findByLabelText('6-digit code'), {
      target: { value: '000000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByText('That code is incorrect or has expired.'),
    ).toBeDefined();
    expect(action).toHaveBeenCalledTimes(2);
  });
});
