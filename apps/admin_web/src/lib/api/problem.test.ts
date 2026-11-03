import { describe, expect, it } from 'vitest';
import { ApiError, fieldErrorsOf, parseProblem } from './problem';

const PROBLEM = {
  type: 'about:blank',
  title: 'Bad Request',
  status: 400,
  detail: 'The request is invalid.',
  code: 'validation_failed',
  errors: [
    { path: 'name', message: 'Enter a shop name.' },
    { path: 'master.phone', message: 'Enter a mobile number.' },
    { path: 'name', message: 'A second message for the same field.' },
  ],
};

describe('parseProblem', () => {
  it('accepts an RFC 9457 problem document', () => {
    expect(parseProblem(PROBLEM)).toEqual(PROBLEM);
  });

  it.each([[null], ['Internal Server Error'], [{ message: 'not a problem' }]])(
    'returns null for %j',
    (body) => {
      expect(parseProblem(body)).toBeNull();
    },
  );
});

describe('fieldErrorsOf', () => {
  it('keys the first message of each field by its dotted path', () => {
    expect(fieldErrorsOf(parseProblem(PROBLEM))).toEqual({
      name: 'Enter a shop name.',
      'master.phone': 'Enter a mobile number.',
    });
  });

  it('is empty without a problem', () => {
    expect(fieldErrorsOf(null)).toEqual({});
  });
});

describe('ApiError', () => {
  it('exposes the problem code', () => {
    expect(new ApiError(400, parseProblem(PROBLEM)).code).toBe(
      'validation_failed',
    );
    expect(new ApiError(502, null).code).toBeUndefined();
  });
});
