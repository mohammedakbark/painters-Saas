import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { categoryChoices } = await import('./shop-categories');

const category = (id: string, name: string, active = true, own = false) => ({
  id,
  name,
  sortOrder: 0,
  active,
  own,
  productCount: 0,
});

describe('categoryChoices', () => {
  const all = [
    category('a', 'Primer'),
    category('b', 'Tools', true, true),
    category('c', 'Old kits', false, true),
  ];

  it('offers the active platform and own categories', () => {
    expect(categoryChoices(all)).toEqual([
      { id: 'a', name: 'Primer' },
      { id: 'b', name: 'Tools' },
    ]);
  });

  it("keeps a product's archived category, marked archived", () => {
    expect(categoryChoices(all, 'c').at(-1)).toEqual({
      id: 'c',
      name: 'Old kits (archived)',
    });
  });
});
