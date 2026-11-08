import { Controller, Get, Injectable } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { z } from 'zod';
import { ProblemDetailsSchema } from '../common/http/problem-details.js';
import { PlatformAdminOnly } from '../platform-admin/platform-admin.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';

export const PlatformSummarySchema = z
  .object({
    reviews: z.object({
      waiting: z.int(),
      /** When the longest-waiting review was submitted; null when none wait. */
      oldestSubmittedAt: z.iso.datetime().nullable(),
    }),
    shops: z.object({
      live: z.int(),
      inReview: z.int(),
      changesRequested: z.int(),
      draft: z.int(),
    }),
    catalogue: z.object({
      brands: z.int(),
      products: z.int(),
      shades: z.int(),
    }),
  })
  .meta({ id: 'PlatformSummary' });

export type PlatformSummary = z.infer<typeof PlatformSummarySchema>;

/**
 * Counts for the platform Overview (UX-003). Counts only: no shop names,
 * people or prices.
 */
@Injectable()
export class PlatformSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(): Promise<PlatformSummary> {
    const [byStatus, oldest, brands, products, shades] = await Promise.all([
      this.prisma.shop.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.shopReview.findFirst({
        where: { decision: null, shop: { status: 'PENDING_REVIEW' } },
        orderBy: { submittedAt: 'asc' },
        select: { submittedAt: true },
      }),
      this.prisma.brand.count({ where: { active: true } }),
      this.prisma.catalogueProduct.count({ where: { active: true } }),
      this.prisma.shade.count({ where: { active: true } }),
    ]);
    const count = (status: string) =>
      byStatus.find((row) => row.status === status)?._count._all ?? 0;
    return {
      reviews: {
        waiting: count('PENDING_REVIEW'),
        oldestSubmittedAt: oldest?.submittedAt.toISOString() ?? null,
      },
      shops: {
        live: count('ACTIVE'),
        inReview: count('PENDING_REVIEW'),
        changesRequested: count('CHANGES_REQUESTED'),
        draft: count('DRAFT'),
      },
      catalogue: { brands, products, shades },
    };
  }
}

@ApiTags('platform')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ standardSchema: ProblemDetailsSchema })
@ApiForbiddenResponse({ standardSchema: ProblemDetailsSchema })
@PlatformAdminOnly()
@Controller('platform/summary')
export class PlatformSummaryController {
  constructor(private readonly summaries: PlatformSummaryService) {}

  @Get()
  @ApiOperation({
    summary:
      'Counts for the platform overview: reviews waiting, shops by status, active catalogue.',
  })
  @ApiOkResponse({ standardSchema: PlatformSummarySchema })
  get(): Promise<PlatformSummary> {
    return this.summaries.summary();
  }
}
