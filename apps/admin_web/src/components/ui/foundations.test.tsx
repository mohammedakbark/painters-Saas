import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmActionButton } from './confirm-action-button';
import { DetailList, Section } from './section';
import { SectionBoundary } from './section-boundary';
import { TableSkeleton } from './skeleton';
import { StateMessage } from './state-message';
import { ToastHost } from './toast';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

function Broken(): never {
  throw new Error('API down');
}

describe('UX-001 foundations', () => {
  it('keeps the page when one section fails, with Try again', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <>
        <p>Products stay</p>
        <SectionBoundary what="orders">
          <Broken />
        </SectionBoundary>
      </>,
    );
    expect(screen.getByText('Products stay')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain(
      'We couldn’t load orders.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refresh).toHaveBeenCalled();
  });

  it('lets redirects and not-found pass through the section boundary', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    function Redirecting(): never {
      throw Object.assign(new Error('NEXT_REDIRECT'), {
        digest: 'NEXT_REDIRECT;replace;/sign-in;307;',
      });
    }
    expect(() =>
      render(
        <SectionBoundary what="orders">
          <Redirecting />
        </SectionBoundary>,
      ),
    ).toThrow('NEXT_REDIRECT');
  });

  it('labels skeletons once for screen readers', () => {
    render(<TableSkeleton label="Loading orders…" rows={2} />);
    expect(screen.getByText('Loading orders…').className).toContain('sr-only');
    expect(
      document.querySelector('[aria-busy="true"]')?.getAttribute('aria-busy'),
    ).toBe('true');
  });

  it('titles sections and lists facts', () => {
    render(
      <Section title="Customer" size="side">
        <DetailList items={[{ label: 'Mobile', value: '+91 90000 00001' }]} />
      </Section>,
    );
    const section = screen.getByRole('region', { name: 'Customer' });
    expect(section.textContent).toContain('+91 90000 00001');
  });

  it('draws a plain empty state without a second card', () => {
    render(<StateMessage title="No orders yet" variant="plain" />);
    const message = screen.getByText('No orders yet').parentElement!;
    expect(message.className).not.toContain('border');
  });

  it('asks before a destructive action and shows the result as a toast', async () => {
    const action = vi.fn(async () => ({ saved: 'Site archived.' }));
    render(
      <>
        <ConfirmActionButton
          action={action}
          label="Archive"
          title="Archive this site?"
          message="It is hidden from new orders."
          confirmLabel="Archive site"
        />
        <ToastHost />
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    expect(action).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Archive site' }));
    });
    expect(action).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status').textContent).toContain('Site archived.');
  });
});
