import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

describe('HealthController', () => {
  const readiness = { status: 'ok', checks: { database: 'up' } } as const;
  let controller: HealthController;

  beforeEach(async () => {
    // Resolving the controller through Nest DI also verifies that decorator
    // metadata is emitted correctly by the test transformer.
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: { checkReadiness: vi.fn().mockResolvedValue(readiness) },
        },
      ],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('reports liveness without checking dependencies', () => {
    expect(controller.live()).toEqual({ status: 'ok' });
  });

  it('delegates readiness to HealthService', async () => {
    await expect(controller.ready()).resolves.toEqual(readiness);
  });
});
