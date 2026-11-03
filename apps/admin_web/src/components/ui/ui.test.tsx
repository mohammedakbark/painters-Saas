import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Alert } from './alert';
import { Button } from './button';
import { Field } from './field';

describe('Field', () => {
  it('associates the label, description and error with the input', () => {
    render(
      <Field
        label="Email"
        name="email"
        description="The address you sign in with."
        error="Enter a valid email address."
      />,
    );

    const input = screen.getByLabelText('Email');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(
      'field-email-description field-email-error',
    );
    expect(document.getElementById('field-email-error')?.textContent).toBe(
      'Enter a valid email address.',
    );
  });

  it('is not marked invalid without an error', () => {
    render(<Field label="Email" name="email" />);

    const input = screen.getByLabelText('Email');
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(input.hasAttribute('aria-describedby')).toBe(false);
  });
});

describe('Button', () => {
  it('is disabled and busy while pending, with the pending label', () => {
    render(
      <Button pending pendingLabel="Signing in…">
        Sign in
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Signing in…' });
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
  });

  it('defaults to type="button" so it never submits a form by accident', () => {
    render(<Button>Cancel</Button>);

    expect(screen.getByRole('button').getAttribute('type')).toBe('button');
  });
});

describe('Alert', () => {
  it('announces errors immediately and states the tone in text', () => {
    render(<Alert tone="error">Something failed.</Alert>);

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Error');
    expect(alert.textContent).toContain('Something failed.');
  });

  it('uses a polite status role for success messages', () => {
    render(
      <Alert tone="success" title="Saved">
        Changes saved.
      </Alert>,
    );

    expect(screen.getByRole('status').textContent).toContain('Saved');
  });
});
