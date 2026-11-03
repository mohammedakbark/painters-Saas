import { RequestMethod } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ProblemDetailsFilter } from './common/http/problem-details.filter.js';
import { createValidationPipe } from './common/validation/validation.pipe.js';

/** URI version prefix for every business route (ADR 0006). */
export const API_PREFIX = 'v1';

/**
 * HTTP-level configuration shared by main.ts, the OpenAPI export and the e2e
 * tests, so the documented contract and the tested app match production.
 */
export function configureApp(app: NestExpressApplication): void {
  app.disable('x-powered-by');
  // Infrastructure probes stay unversioned: hosting health checks call them.
  app.setGlobalPrefix(API_PREFIX, {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: 'health/ready', method: RequestMethod.GET },
    ],
  });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.enableShutdownHooks();
}
