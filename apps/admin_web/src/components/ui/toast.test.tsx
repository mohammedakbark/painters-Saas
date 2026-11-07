import { act, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Toast } from './toast';

function Two() {
  const [first, setFirst] = useState(true);
  const [second, setSecond] = useState(false);
  return (
    <>
      {first ? (
        <Toast message={{ text: 'Added.' }} onDismiss={() => setFirst(false)} />
      ) : null}
      {second ? (
        <Toast
          message={{ text: 'Saved.' }}
          onDismiss={() => setSecond(false)}
        />
      ) : null}
      <button type="button" onClick={() => setSecond(true)}>
        Show second
      </button>
    </>
  );
}

describe('Toast', () => {
  it('shows one toast at a time: a newer one replaces the older', () => {
    render(<Two />);
    expect(screen.getByRole('status').textContent).toContain('Added.');
    act(() => {
      screen.getByRole('button', { name: 'Show second' }).click();
    });
    const toasts = screen.getAllByRole('status');
    expect(toasts).toHaveLength(1);
    expect(toasts[0].textContent).toContain('Saved.');
  });
});
