import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/env', () => ({
  serverEnv: () => ({ API_BASE_URL: 'http://api.test' }),
}));

describe('apiRequest timeouts (UX-001)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('turns a stuck API into ApiUnavailableError, never an endless wait', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: unknown, init: RequestInit) => {
        expect(init.signal).toBeInstanceOf(AbortSignal);
        throw new DOMException('The operation timed out.', 'TimeoutError');
      }),
    );
    const { apiRequest } = await import('./client');
    const { ApiUnavailableError } = await import('./problem');
    const request = apiRequest('/v1/me', { token: 't', schema: z.object({}) });
    await expect(request).rejects.toBeInstanceOf(ApiUnavailableError);
    await expect(request).rejects.toThrow('did not answer in time');
  });
});
