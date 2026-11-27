import { describe, expect, it } from 'vitest';
import { creditEventLabel, creditState, creditWarningText } from './labels';

describe('credit labels (CRD-001)', () => {
  it('gives each credit state its own colour', () => {
    const tones = [
      creditState('active', 100),
      creditState('active', -1),
      creditState('stopped', null),
      creditState('none', null),
    ].map((state) => state.tone);
    expect(new Set(tones).size).toBe(4);
    expect(creditState('active', -1).label).toBe('Over limit');
  });

  it('describes history events without full ID numbers', () => {
    const base = {
      id: 'e',
      limitPaise: null,
      previousPaise: null,
      owedPaise: null,
      idType: null,
      idLast4: null,
      reason: null,
      order: null,
      by: 'Anil',
      at: '2026-11-27T10:00:00.000Z',
    };
    expect(
      creditEventLabel({
        ...base,
        kind: 'ID_CHECKED',
        idType: 'AADHAAR',
        idLast4: '1234',
      }),
    ).toBe('ID checked · Aadhaar ···1234');
    expect(
      creditEventLabel({
        ...base,
        kind: 'LIMIT_CHANGED',
        limitPaise: 800000,
        previousPaise: 500000,
      }),
    ).toBe('Limit changed · ₹5,000 → ₹8,000');
  });

  it('hides figures in warnings when the member may not see them', () => {
    expect(
      creditWarningText({
        kind: 'over_limit',
        owedPaise: null,
        limitPaise: null,
      }).message,
    ).not.toContain('₹');
    expect(
      creditWarningText({
        kind: 'over_limit',
        owedPaise: 150000,
        limitPaise: 120000,
      }).message,
    ).toContain('₹1,500');
  });
});
