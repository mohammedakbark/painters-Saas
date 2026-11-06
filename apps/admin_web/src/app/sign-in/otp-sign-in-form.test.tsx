import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OtpFormState } from '@/lib/auth/otp';
import { OtpSignInForm } from './otp-sign-in-form';

describe('OtpSignInForm', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

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
    expect(screen.getByRole('button', { name: 'Change number' })).toBeDefined();
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

  it('submits the code on the sixth digit and shows code errors', async () => {
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

    expect(
      await screen.findByText('That code is incorrect or has expired.'),
    ).toBeDefined();
    expect(action).toHaveBeenCalledTimes(2);
  });

  it('sends the mode with every step and words the button for registering', async () => {
    const modes: unknown[] = [];
    const action = vi.fn(
      (_previous: OtpFormState, formData: FormData): Promise<OtpFormState> => {
        modes.push(formData.get('mode'));
        return Promise.resolve({ step: 'code', phone: '+919999900001' });
      },
    );
    render(<OtpSignInForm action={action} mode="register" />);

    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));

    expect(
      await screen.findByRole('button', { name: 'Verify and continue' }),
    ).toBeDefined();
    expect(modes).toEqual(['register']);
  });

  it('shows +91 before the mobile number', () => {
    render(<OtpSignInForm action={vi.fn()} />);

    expect(screen.getByText('+91')).toBeDefined();
    expect(
      screen.getByLabelText('Mobile number').getAttribute('aria-describedby'),
    ).toContain('field-phone-prefix');
  });

  it('lets people resend a code only after the wait', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const action = vi.fn((): Promise<OtpFormState> =>
      Promise.resolve({
        step: 'code',
        phone: '+919999900001',
        notice: 'We sent a 6-digit code to +91 99999 00001.',
      }),
    );
    render(<OtpSignInForm action={action} />);

    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));

    const waiting = await screen.findByRole('button', {
      name: /^Resend code in /,
    });
    expect(waiting.hasAttribute('disabled')).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(61_000);
    });

    const resend = screen.getByRole('button', { name: 'Resend code' });
    expect(resend.hasAttribute('disabled')).toBe(false);
  });
});
