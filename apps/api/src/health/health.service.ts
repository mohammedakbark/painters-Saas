import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { DependencyStatus, ReadinessResponseDto } from './health.dto.js';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Resolves when every dependency is reachable; otherwise throws HTTP 503. */
  async checkReadiness(): Promise<ReadinessResponseDto> {
    const database = await this.checkDatabase();
    const response: ReadinessResponseDto = {
      status: database === 'up' ? 'ok' : 'error',
      checks: { database },
    };
    if (database === 'down') {
      throw new ServiceUnavailableException(response);
    }
    return response;
  }

  private async checkDatabase(): Promise<DependencyStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'up';
    } catch (error) {
      // Log only the error type/code: driver messages can include host or user names.
      this.logger.warn(
        `Database readiness check failed (${describeError(error)}).`,
      );
      return 'down';
    }
  }
}

function describeError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'unknown error';
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? `${error.name}: ${code}` : error.name;
}
