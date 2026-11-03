import { Logger } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';
import { HealthService } from './health.service.js';

function createService(queryRaw: () => Promise<unknown>): HealthService {
  const prisma = { $queryRaw: vi.fn(queryRaw) };
  return new HealthService(prisma as unknown as PrismaService);
}

describe('HealthService', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports ready when the database answers', async () => {
    const service = createService(() => Promise.resolve([{ '?column?': 1 }]));

    await expect(service.checkReadiness()).resolves.toEqual({
      status: 'ok',
      checks: { database: 'up' },
    });
  });

  it('reports the failing check when the database is unreachable', async () => {
    const service = createService(() =>
      Promise.reject(new Error('connect ECONNREFUSED 127.0.0.1:5432')),
    );

    await expect(service.checkReadiness()).resolves.toEqual({
      status: 'error',
      checks: { database: 'down' },
    });
  });

  it('does not log driver error messages, which can contain connection details', async () => {
    const service = createService(() =>
      Promise.reject(new Error('password authentication failed for user "x"')),
    );

    await service.checkReadiness();

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).not.toContain('password');
  });
});
