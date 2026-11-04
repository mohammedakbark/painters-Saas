import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, type CurrentUserContext } from '../auth/current-user.js';
import { ProblemDetailsSchema } from '../common/http/problem-details.js';
import {
  CurrentShop,
  type ShopContext,
  ShopScoped,
} from '../shop-access/shop-access.guard.js';
import {
  type ShopReviewState,
  ShopReviewStateSchema,
} from './shop-review.schemas.js';
import { ShopReviewService } from './shop-review.service.js';

const PROBLEM = { standardSchema: ProblemDetailsSchema } as const;

/** The owner's side of the shop review (PLT-002). */
@ApiTags('shops')
@ApiBearerAuth()
@ApiUnauthorizedResponse(PROBLEM)
@Controller('shops/:shopId')
export class ShopReviewController {
  constructor(private readonly reviews: ShopReviewService) {}

  @Get('review')
  @ShopScoped()
  @ApiOperation({
    summary:
      'Review status: what is missing, the open submission and the last decision.',
  })
  @ApiOkResponse({ standardSchema: ShopReviewStateSchema })
  state(@CurrentShop() shop: ShopContext): Promise<ShopReviewState> {
    return this.reviews.state(shop);
  }

  @Post('review-submission')
  @ShopScoped()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Submit the shop for review (the checklist must be complete); locks profile, photo and location.',
  })
  @ApiOkResponse({ standardSchema: ShopReviewStateSchema })
  @ApiForbiddenResponse(PROBLEM)
  @ApiConflictResponse(PROBLEM)
  submit(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
  ): Promise<ShopReviewState> {
    return this.reviews.submit(user, shop);
  }

  @Post('review-submission/withdraw')
  @ShopScoped()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw the submission to edit the shop again.' })
  @ApiOkResponse({ standardSchema: ShopReviewStateSchema })
  @ApiForbiddenResponse(PROBLEM)
  @ApiConflictResponse(PROBLEM)
  withdraw(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
  ): Promise<ShopReviewState> {
    return this.reviews.withdraw(user, shop);
  }
}
