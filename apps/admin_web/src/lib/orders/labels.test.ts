import { describe, expect, it } from 'vitest';
import {
  eventSentence,
  formatOrderTime,
  nextStepFor,
  ORDER_STATUS,
  rowNextStep,
} from './labels';

describe('order labels', () => {
  it('gives each status its own colour, Cancelled in red', () => {
    expect(ORDER_STATUS.NEW.tone).toBe('info');
    expect(ORDER_STATUS.PACKING.tone).toBe('warning');
    expect(ORDER_STATUS.READY_FOR_PICKUP.tone).toBe('success');
    expect(ORDER_STATUS.COMPLETED.tone).toBe('neutral');
    expect(ORDER_STATUS.CANCELLED.tone).toBe('error');
  });

  it('offers the next step on a row, never cancelling', () => {
    expect(rowNextStep(['PACKING', 'CANCELLED'])).toBe('PACKING');
    expect(rowNextStep(['CANCELLED'])).toBeNull();
    expect(rowNextStep([])).toBeNull();
    expect(nextStepFor('PACKING', 'DELIVERY')).toBe('OUT_FOR_DELIVERY');
    expect(nextStepFor('PACKING', 'PICKUP')).toBe('READY_FOR_PICKUP');
    expect(nextStepFor('COMPLETED', 'PICKUP')).toBeNull();
  });

  it('says today and yesterday in Indian time', () => {
    const now = Date.parse('2026-11-08T06:00:00Z'); // 11:30 am IST
    expect(formatOrderTime('2026-11-08T04:30:00Z', now)).toMatch(
      /^Today, 10:00/i,
    );
    expect(formatOrderTime('2026-11-07T12:00:00Z', now)).toMatch(
      /^Yesterday, /,
    );
    expect(formatOrderTime('2026-11-01T12:00:00Z', now)).toContain('2026');
  });

  it('writes the timeline in plain words', () => {
    expect(
      eventSentence({
        type: 'status_changed',
        actor: 'SHOP',
        data: { to: 'PACKING' },
      }),
    ).toBe('Moved to packing.');
    expect(
      eventSentence({
        type: 'status_changed',
        actor: 'CUSTOMER',
        data: { to: 'CANCELLED' },
      }),
    ).toBe('Cancelled by the customer.');
    expect(
      eventSentence({ type: 'paid', actor: 'SHOP', data: { method: 'UPI' } }),
    ).toBe('Paid by UPI.');
    expect(
      eventSentence({
        type: 'item_returned',
        actor: 'SHOP',
        data: { quantity: 1, reason: 'Damaged tin' },
      }),
    ).toBe('1 unit returned. Reason: Damaged tin');
  });
});
