import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BRAND } from '@/lib/brand';
import { AuthLayout } from './auth-layout';
import { AuthSteps } from './auth-steps';

describe('AuthLayout', () => {
  it('has one main heading, a way home and the zero.byt credit', () => {
    render(
      <AuthLayout title="Sign in to your shop" footer={<span>Footer</span>}>
        <p>Form</p>
      </AuthLayout>,
    );

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen
        .getByRole('link', { name: /back to the home page/ })
        .getAttribute('href'),
    ).toBe('/');
    expect(screen.getByRole('img', { name: BRAND.companyName })).toBeDefined();
    expect(screen.getByText('Form')).toBeDefined();
  });
});

describe('AuthSteps', () => {
  it('marks the current step and the finished one', () => {
    render(<AuthSteps current={2} />);

    const steps = screen.getAllByRole('listitem');
    expect(steps[0].textContent).toContain('done');
    expect(steps[1].getAttribute('aria-current')).toBe('step');
    expect(steps[1].textContent).toContain('Step 2 of 2');
  });
});
