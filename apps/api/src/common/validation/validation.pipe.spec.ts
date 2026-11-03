import type { ArgumentMetadata } from '@nestjs/common';
import { z } from 'zod';
import { ProblemException } from '../http/problem-details.js';
import { createValidationPipe, toFieldErrors } from './validation.pipe.js';

const schema = z.object({
  name: z.string().trim().min(2, { error: 'Enter at least 2 characters.' }),
  master: z.object({ phone: z.string({ error: 'Enter a mobile number.' }) }),
});

const bodyMetadata = { type: 'body', schema } as unknown as ArgumentMetadata;

describe('createValidationPipe', () => {
  const pipe = createValidationPipe();

  it('returns the parsed value when the input is valid', async () => {
    await expect(
      pipe.transform(
        { name: '  Paint House ', master: { phone: '1' }, extra: 1 },
        bodyMetadata,
      ),
    ).resolves.toEqual({ name: 'Paint House', master: { phone: '1' } });
  });

  it('throws a 400 problem listing every invalid field', async () => {
    const error: unknown = await pipe
      .transform({ name: 'x', master: {} }, bodyMetadata)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ProblemException);
    expect((error as ProblemException).problem).toEqual({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: 'The request is invalid.',
      code: 'validation_failed',
      errors: [
        { path: 'name', message: 'Enter at least 2 characters.' },
        { path: 'master.phone', message: 'Enter a mobile number.' },
      ],
    });
  });

  it('leaves arguments without a schema untouched', async () => {
    const value = { anything: true };

    await expect(
      pipe.transform(value, { type: 'body' } as ArgumentMetadata),
    ).resolves.toBe(value);
  });
});

describe('toFieldErrors', () => {
  it('formats key and path-segment paths, and root issues', () => {
    expect(
      toFieldErrors([
        { message: 'a', path: ['items', 0, 'name'] },
        { message: 'b', path: [{ key: 'master' }, { key: 'phone' }] },
        { message: 'c' },
      ]),
    ).toEqual([
      { path: 'items.0.name', message: 'a' },
      { path: 'master.phone', message: 'b' },
      { path: '', message: 'c' },
    ]);
  });
});
