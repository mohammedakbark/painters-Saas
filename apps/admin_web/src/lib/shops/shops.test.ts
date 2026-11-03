import { describe, expect, it } from 'vitest';
import { shopRoleLabel, shopStatusLabel } from './labels';
import { registerFieldErrors, registerShopSchema } from './register';

describe('shop labels', () => {
  it('describes a draft shop in words', () => {
    expect(shopStatusLabel('DRAFT')).toEqual({
      label: 'Draft',
      tone: 'neutral',
      description: 'Not visible to customers or painters yet.',
    });
    expect(shopRoleLabel('MASTER')).toBe('Owner (master account)');
  });
});

describe('registerShopSchema', () => {
  it('trims both names', () => {
    expect(
      registerShopSchema.parse({
        shopName: ' Lakshmi Paints ',
        ownerName: ' Anil ',
      }),
    ).toEqual({ shopName: 'Lakshmi Paints', ownerName: 'Anil' });
  });

  it.each([
    [{ shopName: 'L', ownerName: 'Anil' }, 'shopName'],
    [{ shopName: 'x'.repeat(121), ownerName: 'Anil' }, 'shopName'],
    [{ shopName: 'Lakshmi Paints', ownerName: '   ' }, 'ownerName'],
  ])('rejects %j', (input, field) => {
    const result = registerShopSchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([field]);
  });
});

describe('registerFieldErrors', () => {
  it('keeps the first message of known fields only', () => {
    expect(
      registerFieldErrors([
        { path: 'shopName', message: 'first' },
        { path: 'shopName', message: 'second' },
        { path: 'master.phone', message: 'unrelated' },
        { path: 'ownerName', message: 'name' },
      ]),
    ).toEqual({ shopName: 'first', ownerName: 'name' });
  });
});
