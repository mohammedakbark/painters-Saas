import { parseIndianMobile } from './indian-mobile.js';

describe('parseIndianMobile', () => {
  it.each([
    ['9876543210', '+919876543210'],
    ['98765 43210', '+919876543210'],
    ['+91 98765-43210', '+919876543210'],
    ['098765 43210', '+919876543210'],
    ['919876543210', '+919876543210'],
    ['(+91) 6123 456 789', '+916123456789'],
  ])('accepts %s', (input, expected) => {
    expect(parseIndianMobile(input)).toBe(expected);
  });

  it.each([
    '',
    '12345',
    '5876543210', // Indian mobiles start with 6–9
    '98765432101',
    '+1 415 555 0100',
    '98765abcde',
    '+44 7700 900123',
  ])('rejects %s', (input) => {
    expect(parseIndianMobile(input)).toBeNull();
  });
});
