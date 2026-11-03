import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { DependencyStatus, ReadinessResponseDto } from './health.dto.js';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Reports each dependency. The controller answers 503 when status is 'error'. */
  async checkReadiness(): Promise<ReadinessResponseDto> {
    const database = await this.checkDatabase();
    return {
      status: database === 'up' ? 'ok' : 'error',
      checks: { database },
    };
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
