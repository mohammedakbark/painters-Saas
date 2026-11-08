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
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, type CurrentUserContext } from '../auth/current-user.js';
import { ProblemDetailsSchema } from '../common/http/problem-details.js';
import {
  CurrentShop,
  type ShopContext,
  ShopScoped,
} from '../shop-access/shop-access.guard.js';
import { problem } from '../shop-catalogue/shop-catalogue-mapping.js';
import { orderNotFound } from './order-locks.js';
import {
  type MarkItemNotAvailableRequest,
  MarkItemNotAvailableRequestSchema,
  type OfferSubstituteRequest,
  OfferSubstituteRequestSchema,
  type OrderDetail,
  OrderDetailSchema,
  type OrderListPage,
  OrderListPageSchema,
  type OrderListQuery,
  OrderListQuerySchema,
  type RecordPaymentRequest,
  RecordPaymentRequestSchema,
  type ReturnItemRequest,
  ReturnItemRequestSchema,
  type UpdateOrderStatusRequest,
  UpdateOrderStatusRequestSchema,
} from './orders.schemas.js';
import { OrdersService } from './orders.service.js';

const PROBLEM = { standardSchema: ProblemDetailsSchema } as const;
const OWNER_ONLY = {
  standardSchema: ProblemDetailsSchema,
  description: 'The caller is a member but not allowed to do this.',
} as const;

const uuid = z.uuid();

/** A malformed id is "not found", like another shop's id. */
function orderId(value: string): string {
  if (!uuid.safeParse(value).success) {
    throw orderNotFound();
  }
  return value;
}

function itemId(value: string): string {
  if (!uuid.safeParse(value).success) {
    throw problem(
      HttpStatus.NOT_FOUND,
      'order_item_not_found',
      'Item not found.',
    );
  }
  return value;
}

/** The shop's orders (ORD-001). Customer routes arrive with the Customer App. */
@ApiTags('orders')
@ApiBearerAuth()
@ApiUnauthorizedResponse(PROBLEM)
@ApiNotFoundResponse(PROBLEM)
@Controller('shops/:shopId/orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @ShopScoped()
  @ApiOperation({
    summary:
      'Orders, newest first, with a status tab, search and filters, and counts per status.',
  })
  @ApiOkResponse({ standardSchema: OrderListPageSchema })
  @ApiBadRequestResponse(PROBLEM)
  list(
    @CurrentShop() shop: ShopContext,
    @Query({ schema: OrderListQuerySchema }) query: OrderListQuery,
  ): Promise<OrderListPage> {
    return this.orders.list(shop, query);
  }

  @Get(':orderId')
  @ShopScoped()
  @ApiOperation({ summary: 'One order with items, totals and the timeline.' })
  @ApiOkResponse({ standardSchema: OrderDetailSchema })
  detail(
    @CurrentShop() shop: ShopContext,
    @Param('orderId') id: string,
  ): Promise<OrderDetail> {
    return this.orders.detail(shop, orderId(id));
  }

  @Post(':orderId/status')
  @ShopScoped()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Move the order to its next step (packing, ready or out for delivery, completed) or cancel it with a reason.',
  })
  @ApiOkResponse({ standardSchema: OrderDetailSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiConflictResponse({
    standardSchema: ProblemDetailsSchema,
    description: 'order_status_invalid: not a step the order can take now.',
  })
  changeStatus(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @Param('orderId') id: string,
    @Body({ schema: UpdateOrderStatusRequestSchema })
    body: UpdateOrderStatusRequest,
  ): Promise<OrderDetail> {
    return this.orders.changeStatus(user, shop, orderId(id), body);
  }

  @Post(':orderId/items/:itemId/not-available')
  @ShopScoped()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Mark an item not available with a message for the customer; the total drops.',
  })
  @ApiOkResponse({ standardSchema: OrderDetailSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiConflictResponse(PROBLEM)
  markNotAvailable(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @Param('orderId') id: string,
    @Param('itemId') item: string,
    @Body({ schema: MarkItemNotAvailableRequestSchema })
    body: MarkItemNotAvailableRequest,
  ): Promise<OrderDetail> {
    return this.orders.markNotAvailable(
      user,
      shop,
      orderId(id),
      itemId(item),
      body,
    );
  }

  @Post(':orderId/items/:itemId/substitute')
  @ShopScoped()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Suggest another pack size, shade or product for an item; it counts once the customer accepts.',
  })
  @ApiOkResponse({ standardSchema: OrderDetailSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiConflictResponse(PROBLEM)
  offerSubstitute(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @Param('orderId') id: string,
    @Param('itemId') item: string,
    @Body({ schema: OfferSubstituteRequestSchema })
    body: OfferSubstituteRequest,
  ): Promise<OrderDetail> {
    return this.orders.offerSubstitute(
      user,
      shop,
      orderId(id),
      itemId(item),
      body,
    );
  }

  @Post(':orderId/payment')
  @ShopScoped()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Record that the customer paid at pickup or delivery (cash, UPI or bank transfer).',
  })
  @ApiOkResponse({ standardSchema: OrderDetailSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiForbiddenResponse(OWNER_ONLY)
  @ApiConflictResponse(PROBLEM)
  recordPayment(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @Param('orderId') id: string,
    @Body({ schema: RecordPaymentRequestSchema }) body: RecordPaymentRequest,
  ): Promise<OrderDetail> {
    return this.orders.recordPayment(user, shop, orderId(id), body);
  }

  @Post(':orderId/items/:itemId/return')
  @ShopScoped()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Record returned units of a completed order; the total is adjusted.',
  })
  @ApiOkResponse({ standardSchema: OrderDetailSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiForbiddenResponse(OWNER_ONLY)
  @ApiConflictResponse(PROBLEM)
  returnItem(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @Param('orderId') id: string,
    @Param('itemId') item: string,
    @Body({ schema: ReturnItemRequestSchema }) body: ReturnItemRequest,
  ): Promise<OrderDetail> {
    return this.orders.returnItem(user, shop, orderId(id), itemId(item), body);
  }
}
