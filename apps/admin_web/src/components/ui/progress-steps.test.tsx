import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressSteps } from './progress-steps';

describe('ProgressSteps', () => {
  it('marks the current step and says each state in words', () => {
    render(
      <ProgressSteps
        label="Order progress"
        steps={[
          { label: 'New', state: 'done' },
          { label: 'Packing', state: 'current' },
          { label: 'Completed', state: 'todo' },
        ]}
      />,
    );
    const list = screen.getByRole('list', { name: 'Order progress' });
    const items = list.querySelectorAll('li');
    expect(items).toHaveLength(3);
    expect(items[1].getAttribute('aria-current')).toBe('step');
    expect(items[0].textContent).toContain('done');
    expect(items[2].textContent).toContain('not yet');
  });
});
