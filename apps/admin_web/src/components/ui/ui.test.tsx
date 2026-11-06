import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Alert } from './alert';
import { Button } from './button';
import { Card, CardList, Panel } from './card';
import { CheckboxGroupField, RadioGroupField } from './choice-group-fields';
import { Field } from './field';
import { FileField } from './file-field';
import { SearchForm } from './search-form';
import { StoreButton } from './store-button';

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

describe('Card, CardList and Panel', () => {
  it('render the requested element with the component surface classes', () => {
    render(
      <>
        <Card as="section" aria-label="Details" className="p-6">
          Body
        </Card>
        <CardList aria-label="Brands">
          <li>One</li>
        </CardList>
        <Panel as="li">Row</Panel>
      </>,
    );

    const section = screen.getByRole('region', { name: 'Details' });
    expect(section.className).toContain('rounded-card');
    expect(section.className).toContain('p-6');
    const list = screen.getByRole('list', { name: 'Brands' });
    expect(list.className).toContain('divide-y');
    expect(screen.getByText('Row').className).toContain('rounded-panel');
  });

  it('uses the subtle tone instead of the card background when asked', () => {
    render(<Card tone="subtle">Empty</Card>);

    const card = screen.getByText('Empty');
    expect(card.className).toContain('bg-surface-subtle');
    expect(card.className).not.toContain('bg-card-background');
  });
});

describe('SearchForm', () => {
  it('is a labelled GET search that keeps hidden values and filters', () => {
    render(
      <SearchForm
        action="/catalogue"
        label="Search products"
        defaultValue="emulsion"
        hidden={{ status: 'ARCHIVED' }}
        submitLabel="Filter"
      >
        <span>Extra filter</span>
      </SearchForm>,
    );

    const form = screen.getByRole('search');
    expect(form.getAttribute('method')).toBe('get');
    expect(form.getAttribute('action')).toBe('/catalogue');
    const field = screen.getByLabelText('Search products') as HTMLInputElement;
    expect(field.name).toBe('q');
    expect(field.value).toBe('emulsion');
    expect(field.maxLength).toBe(60);
    expect(
      (form.querySelector('input[name="status"]') as HTMLInputElement).value,
    ).toBe('ARCHIVED');
    expect(screen.getByText('Extra filter')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Filter' })).toBeTruthy();
  });
});

describe('FileField', () => {
  it('links the description and announces the error', () => {
    render(
      <FileField
        label="CSV file"
        name="file"
        accept=".csv"
        description="Up to 2 MB."
        error="Choose a CSV file."
      />,
    );

    const input = screen.getByLabelText('CSV file');
    expect(input.getAttribute('type')).toBe('file');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(
      'field-file-description field-file-error',
    );
    expect(screen.getByRole('alert').textContent).toBe('Choose a CSV file.');
  });
});

describe('RadioGroupField and CheckboxGroupField', () => {
  const options = [
    { value: 'A', label: 'Alpha', description: 'First.' },
    { value: 'B', label: 'Beta' },
  ];

  it('checks the default radio and links its description', () => {
    render(
      <RadioGroupField
        legend="Pick one"
        name="pick"
        options={options}
        defaultValue="A"
        error="Choose one."
      />,
    );

    const alpha = screen.getByLabelText('Alpha') as HTMLInputElement;
    expect(alpha.type).toBe('radio');
    expect(alpha.checked).toBe(true);
    expect(alpha.getAttribute('aria-describedby')).toBe('pick-A-description');
    expect(
      screen
        .getByRole('group', { name: 'Pick one' })
        .getAttribute('aria-describedby'),
    ).toBe('pick-error');
  });

  it('checks every default checkbox and links the hint', () => {
    render(
      <CheckboxGroupField
        legend="Reasons"
        name="reasons"
        hint="Choose any."
        options={options}
        defaultValues={['A', 'B']}
      />,
    );

    expect((screen.getByLabelText('Alpha') as HTMLInputElement).checked).toBe(
      true,
    );
    expect((screen.getByLabelText('Beta') as HTMLInputElement).checked).toBe(
      true,
    );
    expect(
      screen
        .getByRole('group', { name: 'Reasons' })
        .getAttribute('aria-describedby'),
    ).toBe('reasons-hint');
  });
});

describe('StoreButton', () => {
  it('links to the store page when the app is published', () => {
    render(
      <StoreButton
        store="google-play"
        appName="Shop App"
        href="https://play.google.com/store/apps/details?id=example"
      />,
    );

    const link = screen.getByRole('link', {
      name: 'Shop App: Get it on Google Play',
    });
    expect(link.getAttribute('href')).toContain('play.google.com');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('is disabled and says coming soon without a store page', () => {
    render(<StoreButton store="app-store" appName="Shop App" href={null} />);

    const placeholder = screen.getByRole('link', {
      name: 'Shop App on App Store: coming soon',
    });
    expect(placeholder.getAttribute('aria-disabled')).toBe('true');
    expect(placeholder.getAttribute('href')).toBeNull();
    expect(placeholder.textContent).toContain('Coming soon to');
  });
});

describe('Field prefix', () => {
  it('shows the prefix and links it to the input', () => {
    render(<Field label="Mobile number" name="phone" prefix="+91" />);

    const input = screen.getByLabelText('Mobile number');
    expect(screen.getByText('+91').id).toBe('field-phone-prefix');
    expect(input.getAttribute('aria-describedby')).toBe('field-phone-prefix');
  });
});

describe('Button tertiary', () => {
  it('uses the tertiary button tokens', () => {
    render(<Button variant="tertiary">Change number</Button>);

    expect(
      screen.getByRole('button', { name: 'Change number' }).className,
    ).toContain('text-button-tertiary-foreground');
  });
});
