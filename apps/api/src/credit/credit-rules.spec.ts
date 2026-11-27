import { describe, expect, it } from 'vitest';
import { creditState, creditWarning } from './credit-rules.js';

describe('creditState', () => {
  it('has no credit without events', () => {
    expect(creditState([])).toEqual({ status: 'none', limitPaise: null });
  });

  it('takes the latest limit and ignores ID checks and overrides', () => {
    expect(
      creditState([
        { kind: 'ID_CHECKED', limitPaise: null },
        { kind: 'GIVEN', limitPaise: 500_000 },
        { kind: 'OVERRIDE', limitPaise: 500_000 },
        { kind: 'LIMIT_CHANGED', limitPaise: 800_000 },
      ]),
    ).toEqual({ status: 'active', limitPaise: 800_000 });
  });

  it('is stopped after a stop, and active again when given again', () => {
    const stopped = [
      { kind: 'GIVEN' as const, limitPaise: 500_000 },
      { kind: 'STOPPED' as const, limitPaise: null },
    ];
    expect(creditState(stopped)).toEqual({
      status: 'stopped',
      limitPaise: null,
    });
    expect(
      creditState([...stopped, { kind: 'GIVEN', limitPaise: 100_000 }]),
    ).toEqual({ status: 'active', limitPaise: 100_000 });
  });
});

describe('creditWarning', () => {
  const active = { status: 'active' as const, limitPaise: 1_000_00 };

  it('warns when the order takes the customer past the limit', () => {
    expect(
      creditWarning({ ...active, owedPaise: 600_00, orderPaise: 500_00 }),
    ).toEqual({
      kind: 'over_limit',
      owedPaise: 1_100_00,
      limitPaise: 1_000_00,
    });
  });

  it('allows reaching the limit exactly', () => {
    expect(
      creditWarning({ ...active, owedPaise: 500_00, orderPaise: 500_00 }),
    ).toBeNull();
  });

  it('warns a customer without credit only when they already owe', () => {
    for (const status of ['none', 'stopped'] as const) {
      expect(
        creditWarning({
          status,
          limitPaise: null,
          owedPaise: 0,
          orderPaise: 900_00,
        }),
      ).toBeNull();
      expect(
        creditWarning({
          status,
          limitPaise: null,
          owedPaise: 200_00,
          orderPaise: 900_00,
        }),
      ).toEqual({ kind: 'no_credit', owedPaise: 1_100_00, limitPaise: null });
    }
  });

  it('does not warn when the shop owes the customer', () => {
    expect(
      creditWarning({
        status: 'none',
        limitPaise: null,
        owedPaise: -300_00,
        orderPaise: 100_00,
      }),
    ).toBeNull();
  });
});
