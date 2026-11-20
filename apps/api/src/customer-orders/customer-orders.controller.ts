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
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, type CurrentUserContext } from '../auth/current-user.js';
import { ProblemDetailsSchema } from '../common/http/problem-details.js';
import {
  type AnswerSubstituteRequest,
  AnswerSubstituteRequestSchema,
  type CancelMyOrderRequest,
  CancelMyOrderRequestSchema,
  type MyOrder,
  type MyOrderList,
  type MyOrderListQuery,
  MyOrderListQuerySchema,
  MyOrderListSchema,
  MyOrderSchema,
  type PlacedOrder,
  PlacedOrderSchema,
  type PlaceOrderRequest,
  PlaceOrderRequestSchema,
} from './customer-orders.schemas.js';
import { CustomerOrdersService } from './customer-orders.service.js';

const PROBLEM = { standardSchema: ProblemDetailsSchema } as const;
const NOT_FOUND = {
  standardSchema: ProblemDetailsSchema,
  description: 'order_not_found: not one of the callers orders.',
} as const;

/** The customer's own orders (CUS-006). */
@ApiTags('me')
@ApiBearerAuth()
@ApiUnauthorizedResponse(PROBLEM)
@Controller('me/orders')
export class CustomerOrdersController {
  constructor(private readonly orders: CustomerOrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Place an order from the cart. Repeating the same clientRequestId returns the same order.',
  })
  @ApiCreatedResponse({ standardSchema: PlacedOrderSchema })
  @ApiBadRequestResponse({
    standardSchema: ProblemDetailsSchema,
    description:
      'Validation, site_required (painters), site_not_found, site_not_allowed, delivery_location_required.',
  })
  @ApiNotFoundResponse({
    standardSchema: ProblemDetailsSchema,
    description: 'shop_not_found or delivery_location_not_found.',
  })
  @ApiConflictResponse({
    standardSchema: ProblemDetailsSchema,
    description:
      'order_total_changed, delivery_unavailable, delivery_out_of_range, pack not available.',
  })
  place(
    @CurrentUser() user: CurrentUserContext,
    @Body({ schema: PlaceOrderRequestSchema }) body: PlaceOrderRequest,
  ): Promise<PlacedOrder> {
    return this.orders.place(user, body);
  }

  @Get()
  @ApiOperation({ summary: 'My orders from every shop, newest first.' })
  @ApiOkResponse({ standardSchema: MyOrderListSchema })
  list(
    @CurrentUser() user: CurrentUserContext,
    @Query({ schema: MyOrderListQuerySchema }) query: MyOrderListQuery,
  ): Promise<MyOrderList> {
    return this.orders.list(user, query);
  }

  @Get(':orderId')
  @ApiOperation({ summary: 'One of my orders with its items and steps.' })
  @ApiOkResponse({ standardSchema: MyOrderSchema })
  @ApiNotFoundResponse(NOT_FOUND)
  get(
    @CurrentUser() user: CurrentUserContext,
    @Param('orderId') orderId: string,
  ): Promise<MyOrder> {
    return this.orders.get(user, orderId);
  }

  @Post(':orderId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel before the order is ready or out for delivery (D-047).',
  })
  @ApiOkResponse({ standardSchema: MyOrderSchema })
  @ApiNotFoundResponse(NOT_FOUND)
  @ApiConflictResponse({
    standardSchema: ProblemDetailsSchema,
    description: 'order_status_invalid: it can no longer be cancelled.',
  })
  cancel(
    @CurrentUser() user: CurrentUserContext,
    @Param('orderId') orderId: string,
    @Body({ schema: CancelMyOrderRequestSchema }) body: CancelMyOrderRequest,
  ): Promise<MyOrder> {
    return this.orders.cancel(user, orderId, body);
  }

  @Post(':orderId/items/:itemId/substitute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Accept or decline a suggested substitute (D-045).',
  })
  @ApiOkResponse({ standardSchema: MyOrderSchema })
  @ApiNotFoundResponse(NOT_FOUND)
  @ApiConflictResponse({
    standardSchema: ProblemDetailsSchema,
    description: 'substitute_not_open: already answered or withdrawn.',
  })
  answerSubstitute(
    @CurrentUser() user: CurrentUserContext,
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
    @Body({ schema: AnswerSubstituteRequestSchema })
    body: AnswerSubstituteRequest,
  ): Promise<MyOrder> {
    return this.orders.answerSubstitute(user, orderId, itemId, body);
  }
}
