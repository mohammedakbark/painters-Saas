import { describe, expect, it } from 'vitest';
import { formatIndianMobile, parseIndianMobile } from './phone';

describe('parseIndianMobile', () => {
  it.each([
    ['9876543210', '+919876543210'],
    ['98765 43210', '+919876543210'],
    ['+91 98765-43210', '+919876543210'],
    ['+919876543210', '+919876543210'],
    ['919876543210', '+919876543210'],
    ['098765 43210', '+919876543210'],
    ['(+91) 6123 456 789', '+916123456789'],
  ])('accepts %s', (input, expected) => {
    expect(parseIndianMobile(input)).toBe(expected);
  });

  it.each([
    ['empty', ''],
    ['too short', '98765'],
    ['too long', '987654321012'],
    ['starting with 5', '5876543210'],
    ['another country', '+14155550100'],
    ['letters', '98765abcde'],
    ['a plus in the middle', '98765+43210'],
  ])('rejects %s', (_name, input) => {
    expect(parseIndianMobile(input)).toBeNull();
  });
});

describe('formatIndianMobile', () => {
  it('groups an Indian number for display', () => {
    expect(formatIndianMobile('+919999900001')).toBe('+91 99999 00001');
  });

  it('returns other values unchanged', () => {
    expect(formatIndianMobile('+14155550100')).toBe('+14155550100');
  });
});
