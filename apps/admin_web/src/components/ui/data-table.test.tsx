import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Badge } from './badge';
import { ColumnSelectFilter } from './column-filter';
import { type Column, DataTable, SortHeader } from './data-table';
import { pageNumbers, Pagination } from './pagination';

interface Row {
  id: string;
  name: string;
  price: string;
}

const COLUMNS: Column<Row>[] = [
  {
    key: 'name',
    header: 'Product',
    sorted: 'ascending',
    headerContent: (
      <SortHeader label="Product" href="?sort=-name" direction="ascending" />
    ),
    filter: <span>name filter</span>,
    cell: (row) => row.name,
  },
  { key: 'price', header: 'Price', align: 'end', cell: (row) => row.price },
];

describe('DataTable', () => {
  it('renders a captioned table with headers, filters and rows', () => {
    render(
      <DataTable
        caption="Pack sizes"
        columns={COLUMNS}
        rows={[
          { id: '1', name: 'Silk Emulsion', price: '₹450' },
          { id: '2', name: 'Wall Putty', price: '₹120' },
        ]}
        rowKey={(row) => row.id}
      />,
    );
    const table = screen.getByRole('table', { name: 'Pack sizes' });
    expect(
      within(table)
        .getByRole('columnheader', { name: /Product/ })
        .getAttribute('aria-sort'),
    ).toBe('ascending');
    expect(within(table).getByText('name filter')).toBeDefined();
    const cell = within(table).getByText('Wall Putty');
    expect(cell.closest('td')?.getAttribute('data-label')).toBe('Product');
    expect(
      screen
        .getByRole('link', { name: 'Product, sort descending' })
        .getAttribute('href'),
    ).toBe('?sort=-name');
  });

  it('shows the empty state in place of rows', () => {
    render(
      <DataTable
        caption="Pack sizes"
        columns={COLUMNS}
        rows={[]}
        rowKey={(row) => row.id}
        empty={<p>No pack sizes match these filters</p>}
      />,
    );
    expect(screen.getByText('No pack sizes match these filters')).toBeDefined();
  });
});

describe('Pagination', () => {
  it('lists the first, last and nearby pages with gaps', () => {
    expect(pageNumbers(1, 1)).toEqual([1]);
    expect(pageNumbers(5, 10)).toEqual([1, 'gap', 4, 5, 6, 'gap', 10]);
    expect(pageNumbers(2, 3)).toEqual([1, 2, 3]);
  });

  it('says what is shown and links to pages, keeping the current one marked', () => {
    render(
      <Pagination
        page={2}
        pageSize={25}
        total={60}
        href={(page) => `?page=${page}`}
        form="filters"
        pageSizes={[10, 25, 50]}
        noun="pack sizes"
      />,
    );
    expect(screen.getByText(/Showing/).textContent).toBe(
      'Showing 26–50 of 60 pack sizes',
    );
    expect(
      screen.getByRole('link', { name: 'Page 2' }).getAttribute('aria-current'),
    ).toBe('page');
    expect(
      screen.getByRole('link', { name: 'Next page' }).getAttribute('href'),
    ).toBe('?page=3');
    expect(
      screen.getByRole('link', { name: 'Previous page' }).getAttribute('href'),
    ).toBe('?page=1');
    expect(
      (screen.getByLabelText('Rows per page') as HTMLSelectElement).value,
    ).toBe('25');
  });
});

describe('ColumnSelectFilter', () => {
  it('offers All plus the values and submits its form on change', () => {
    const submit = vi.fn((event: Event) => event.preventDefault());
    render(
      <>
        <form id="filters" onSubmit={(event) => submit(event.nativeEvent)} />
        <ColumnSelectFilter
          form="filters"
          name="available"
          label="Filter by availability"
          value={undefined}
          options={[
            { value: 'true', label: 'Available' },
            { value: 'false', label: 'Not available' },
          ]}
        />
      </>,
    );
    const select = screen.getByLabelText(
      'Filter by availability',
    ) as HTMLSelectElement;
    expect([...select.options].map((option) => option.text)).toEqual([
      'All',
      'Available',
      'Not available',
    ]);
    fireEvent.change(select, { target: { value: 'false' } });
    expect(submit).toHaveBeenCalledOnce();
  });
});

describe('Badge', () => {
  it('gives opposite states different colours', () => {
    render(
      <>
        <Badge tone="success">Available</Badge>
        <Badge tone="warning">Not available</Badge>
      </>,
    );
    const available = screen.getByText('Available').className;
    const notAvailable = screen.getByText('Not available').className;
    expect(available).toContain('bg-status-success-soft');
    expect(notAvailable).toContain('bg-status-warning-soft');
    expect(available).not.toEqual(notAvailable);
  });
});
