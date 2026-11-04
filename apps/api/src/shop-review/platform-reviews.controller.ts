import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, type CurrentUserContext } from '../auth/current-user.js';
import { ProblemDetailsSchema } from '../common/http/problem-details.js';
import { PlatformAdminOnly } from '../platform-admin/platform-admin.guard.js';
import { PlatformReviewsService } from './platform-reviews.service.js';
import {
  type ReviewDecisionRequest,
  ReviewDecisionRequestSchema,
  type ReviewDecisionResult,
  ReviewDecisionResultSchema,
  type ReviewQueuePage,
  ReviewQueuePageSchema,
  type ReviewQueueQuery,
  ReviewQueueQuerySchema,
  type ShopReviewSnapshot,
  ShopReviewSnapshotSchema,
} from './shop-review.schemas.js';

const PROBLEM = { standardSchema: ProblemDetailsSchema } as const;

/** Platform review of shops (PLT-002). Platform admins only. */
@ApiTags('platform')
@ApiBearerAuth()
@ApiUnauthorizedResponse(PROBLEM)
@PlatformAdminOnly()
@Controller('platform')
export class PlatformReviewsController {
  constructor(private readonly reviews: PlatformReviewsService) {}

  @Get('reviews')
  @ApiOperation({ summary: 'Shops waiting for review, oldest first.' })
  @ApiOkResponse({ standardSchema: ReviewQueuePageSchema })
  @ApiBadRequestResponse(PROBLEM)
  queue(
    @Query({ schema: ReviewQueueQuerySchema }) query: ReviewQueueQuery,
  ): Promise<ReviewQueuePage> {
    return this.reviews.queue(query);
  }

  @Get('shops/:shopId/review')
  @ApiOperation({
    summary:
      "The shop's profile, checklist, products and review history (each view is audited).",
  })
  @ApiOkResponse({ standardSchema: ShopReviewSnapshotSchema })
  @ApiNotFoundResponse(PROBLEM)
  snapshot(
    @CurrentUser() admin: CurrentUserContext,
    @Param('shopId') shopId: string,
  ): Promise<ShopReviewSnapshot> {
    return this.reviews.snapshot(admin, shopId);
  }

  @Post('shops/:shopId/review/decision')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve the shop (it goes live) or request changes with reasons.',
  })
  @ApiOkResponse({ standardSchema: ReviewDecisionResultSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiNotFoundResponse(PROBLEM)
  @ApiConflictResponse(PROBLEM)
  decide(
    @CurrentUser() admin: CurrentUserContext,
    @Param('shopId') shopId: string,
    @Body({ schema: ReviewDecisionRequestSchema }) body: ReviewDecisionRequest,
  ): Promise<ReviewDecisionResult> {
    return this.reviews.decide(admin, shopId, body);
  }
}
