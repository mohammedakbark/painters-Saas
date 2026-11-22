import { describe, expect, it } from 'vitest';
import { balanceState, signedRupees } from './labels';

describe('bill labels (BIL-001)', () => {
  it('says who owes whom, each with its own tone', () => {
    expect(balanceState(150000)).toEqual({
      label: 'Owes you',
      amount: '₹1,500',
      tone: 'warning',
    });
    expect(balanceState(-50000)).toEqual({
      label: 'You owe',
      amount: '₹500',
      tone: 'info',
    });
    expect(balanceState(0)).toMatchObject({
      label: 'Settled',
      tone: 'success',
    });
  });

  it('signs entries by what they do to the bill', () => {
    expect(signedRupees(100000)).toBe('+₹1,000');
    expect(signedRupees(-25050)).toBe('−₹250.5');
  });
});
