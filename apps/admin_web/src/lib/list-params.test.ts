import { describe, expect, it } from 'vitest';
import { daysSince } from './format';
import { listLink, oneOf, readPaging, text } from './list-params';

describe('list URL state', () => {
  it('reads text, allowed values and paging safely', () => {
    expect(text('  silk ')).toBe('silk');
    expect(text('')).toBeUndefined();
    expect(text(['a', 'b'])).toBeUndefined();
    expect(oneOf(['oldest', 'newest'] as const, 'newest', 'oldest')).toBe(
      'newest',
    );
    expect(oneOf(['oldest', 'newest'] as const, 'random', 'oldest')).toBe(
      'oldest',
    );
    expect(readPaging({ page: '3', pageSize: '50' })).toEqual({
      page: 3,
      pageSize: 50,
    });
    expect(readPaging({ page: '-1', pageSize: '7' })).toEqual({
      page: 1,
      pageSize: 25,
    });
  });

  it('builds links that leave defaults and empty values out', () => {
    const defaults = { sort: 'newest', page: '1', pageSize: '25' };
    expect(
      listLink(
        '/platform/shops',
        { sort: 'newest', page: 1, pageSize: 25, q: '' },
        defaults,
      ),
    ).toBe('/platform/shops');
    expect(
      listLink(
        '/platform/shops',
        { sort: 'name', page: 2, pageSize: 25, status: 'ACTIVE' },
        defaults,
      ),
    ).toBe('/platform/shops?sort=name&page=2&status=ACTIVE');
  });

  it('counts whole days since a time', () => {
    const now = Date.parse('2026-11-07T12:00:00Z');
    expect(daysSince('2026-11-07T09:00:00Z', now)).toBe(0);
    expect(daysSince('2026-11-04T11:00:00Z', now)).toBe(3);
    expect(daysSince('2026-11-08T09:00:00Z', now)).toBe(0);
  });
});
