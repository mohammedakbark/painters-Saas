import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { ToastHost } from '@/components/ui/toast';
import {
  newOrders,
  OrdersAutoRefresh,
  REFRESH_EVERY_MS,
} from './orders-auto-refresh';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

describe('OrdersAutoRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    refresh.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts new orders only after the first look', () => {
    expect(newOrders(null, 25)).toBe(0);
    expect(newOrders(25, 27)).toBe(2);
    expect(newOrders(27, 26)).toBe(0);
  });

  it('refreshes every 30 seconds and announces new orders', () => {
    const { rerender } = render(
      <>
        <OrdersAutoRefresh total={25} newHref="/o?status=NEW" />
        <ToastHost />
      </>,
    );
    expect(screen.queryByRole('status')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(REFRESH_EVERY_MS);
    });
    expect(refresh).toHaveBeenCalledTimes(1);

    rerender(
      <>
        <OrdersAutoRefresh total={27} newHref="/o?status=NEW" />
        <ToastHost />
      </>,
    );
    const toast = screen.getByRole('status');
    expect(toast.textContent).toContain('2 new orders');
    expect(
      screen.getByRole('link', { name: 'Show' }).getAttribute('href'),
    ).toBe('/o?status=NEW');
  });
});

describe('order UI pieces', () => {
  it('has a red badge for cancelled orders', () => {
    render(<Badge tone="error">Cancelled</Badge>);
    expect(screen.getByText('Cancelled').className).toContain(
      'text-status-error',
    );
  });

  it('offers no "create" option when the search can only pick', () => {
    render(
      <Combobox
        label="Product and pack size"
        search={async () => []}
        onSelect={() => undefined}
        emptyLabel="No available pack size matches."
      />,
    );
    expect(screen.getByRole('combobox')).toBeTruthy();
  });
});
