import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ShopRegistryPage } from '@/lib/api/platform-shops';
import { ShopRegistryList } from './shop-registry-list';

const SHOP = {
  id: '01a1a16e-1406-712e-bc9c-d15db0a0f4fa',
  name: 'Lakshmi Paints',
  status: 'DRAFT',
  createdAt: '2026-11-03T10:30:00.000Z',
  updatedAt: '2026-11-03T10:30:00.000Z',
  master: { name: 'Anil Kumar', phone: '+919999900002' },
} as const satisfies ShopRegistryPage['items'][number];

describe('ShopRegistryList', () => {
  it('shows the empty state on the first page without shops', () => {
    render(
      <ShopRegistryList page={{ items: [], nextCursor: null }} isFirstPage />,
    );

    expect(
      screen.getByRole('heading', { name: 'No shops have registered yet' }),
    ).toBeDefined();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('lists shops in a table with owner, mobile, status text and date', () => {
    render(
      <ShopRegistryList
        page={{ items: [SHOP], nextCursor: null }}
        isFirstPage
      />,
    );

    const table = screen.getByRole('table');
    const row = within(table).getAllByRole('row')[1]!;
    expect(
      within(row)
        .getByRole('link', { name: 'Lakshmi Paints' })
        .getAttribute('href'),
    ).toBe(`/platform/shops/${SHOP.id}`);
    expect(row.textContent).toContain('Draft');
    expect(row.textContent).toContain('Anil Kumar');
    expect(row.textContent).toContain('+91 99999 00002');
    expect(row.textContent).toContain('3 Nov 2026');
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).toBeNull();
  });

  it('offers the next page when there is a cursor', () => {
    render(
      <ShopRegistryList
        page={{ items: [SHOP], nextCursor: SHOP.id }}
        isFirstPage
      />,
    );

    const pagination = screen.getByRole('navigation', { name: 'Pagination' });
    expect(
      within(pagination)
        .getByRole('link', { name: 'Next page' })
        .getAttribute('href'),
    ).toBe(`/platform/shops?cursor=${SHOP.id}`);
    expect(
      within(pagination).queryByRole('link', { name: 'First page' }),
    ).toBeNull();
  });

  it('offers the first page after paging, and says when nothing is left', () => {
    render(
      <ShopRegistryList
        page={{ items: [], nextCursor: null }}
        isFirstPage={false}
      />,
    );

    expect(screen.getByText('No more shops.')).toBeDefined();
    expect(
      screen.getByRole('link', { name: 'First page' }).getAttribute('href'),
    ).toBe('/platform/shops');
  });

  it('copes with a shop whose master is missing', () => {
    render(
      <ShopRegistryList
        page={{ items: [{ ...SHOP, master: null }], nextCursor: null }}
        isFirstPage
      />,
    );

    expect(screen.getByText(/Owner unknown/)).toBeDefined();
  });
});
