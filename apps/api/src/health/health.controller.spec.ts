import { Test } from '@nestjs/testing';
import type { Response } from 'express';
import type { ReadinessResponseDto } from './health.dto.js';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

describe('HealthController', () => {
  let checkReadiness: ReturnType<
    typeof vi.fn<() => Promise<ReadinessResponseDto>>
  >;
  let controller: HealthController;

  function fakeResponse(): Response & { status: ReturnType<typeof vi.fn> } {
    const response = { status: vi.fn() };
    response.status.mockReturnValue(response);
    return response as unknown as Response & {
      status: ReturnType<typeof vi.fn>;
    };
  }

  beforeEach(async () => {
    checkReadiness = vi.fn<() => Promise<ReadinessResponseDto>>();
    // Resolving the controller through Nest DI also verifies that decorator
    // metadata is emitted correctly by the test transformer.
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: { checkReadiness } }],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('reports liveness without checking dependencies', () => {
    expect(controller.live()).toEqual({ status: 'ok' });
  });

  it('answers 200 with the checks when every dependency is up', async () => {
    const ready = { status: 'ok', checks: { database: 'up' } } as const;
    checkReadiness.mockResolvedValue(ready);
    const response = fakeResponse();

    await expect(controller.ready(response)).resolves.toEqual(ready);
    expect(response.status).not.toHaveBeenCalled();
  });

  it('answers 503 with the failing check when a dependency is down', async () => {
    const down = { status: 'error', checks: { database: 'down' } } as const;
    checkReadiness.mockResolvedValue(down);
    const response = fakeResponse();

    await expect(controller.ready(response)).resolves.toEqual(down);
    expect(response.status).toHaveBeenCalledWith(503);
  });
});
