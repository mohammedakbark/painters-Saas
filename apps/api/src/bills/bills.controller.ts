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
import {
  type Bill,
  type BillListPage,
  BillListPageSchema,
  type BillListQuery,
  BillListQuerySchema,
  type BillMoneyRequest,
  BillMoneyRequestSchema,
  type BillQuery,
  BillQuerySchema,
  BillSchema,
} from './bills.schemas.js';
import { BillsService, customerNotFound } from './bills.service.js';

const PROBLEM = { standardSchema: ProblemDetailsSchema } as const;
const uuid = z.uuid();

/** A malformed id is "not found", like another shop's id. */
const customerId = (value: string) => {
  if (!uuid.safeParse(value).success) throw customerNotFound();
  return value;
};

/** Running bills with the shop's customers (BIL-001, D-062). */
@ApiTags('bills')
@ApiBearerAuth()
@ApiUnauthorizedResponse(PROBLEM)
@ApiForbiddenResponse(PROBLEM)
@Controller('shops/:shopId')
export class BillsController {
  constructor(private readonly bills: BillsService) {}

  @Get('bills')
  @ShopScoped()
  @ApiOperation({
    summary:
      'Customers with a running bill and their balances, largest owed first.',
  })
  @ApiOkResponse({ standardSchema: BillListPageSchema })
  @ApiBadRequestResponse(PROBLEM)
  list(
    @CurrentShop() shop: ShopContext,
    @Query({ schema: BillListQuerySchema }) query: BillListQuery,
  ): Promise<BillListPage> {
    return this.bills.list(shop, query);
  }

  @Get('customers/:customerId/bill')
  @ShopScoped()
  @ApiOperation({
    summary:
      "One customer's running bill: balance, billed per site and entries, newest first.",
  })
  @ApiOkResponse({ standardSchema: BillSchema })
  @ApiNotFoundResponse(PROBLEM)
  bill(
    @CurrentShop() shop: ShopContext,
    @Param('customerId') id: string,
    @Query({ schema: BillQuerySchema }) query: BillQuery,
  ): Promise<Bill> {
    return this.bills.bill(shop, customerId(id), query);
  }

  @Post('customers/:customerId/bill/payments')
  @ShopScoped()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Record a payment of any amount up to what the customer owes; it pays the oldest orders first.',
  })
  @ApiOkResponse({ standardSchema: BillSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiNotFoundResponse(PROBLEM)
  @ApiConflictResponse({
    standardSchema: ProblemDetailsSchema,
    description:
      'bill_nothing_owed, payment_exceeds_balance or request_id_reused.',
  })
  pay(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @Param('customerId') id: string,
    @Body({ schema: BillMoneyRequestSchema }) body: BillMoneyRequest,
  ): Promise<Bill> {
    return this.bills.pay(user, shop, customerId(id), body);
  }

  @Post('customers/:customerId/bill/refunds')
  @ShopScoped()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Record money paid back to the customer, up to what the shop owes (after a return).',
  })
  @ApiOkResponse({ standardSchema: BillSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiNotFoundResponse(PROBLEM)
  @ApiConflictResponse({
    standardSchema: ProblemDetailsSchema,
    description: 'bill_nothing_owed, refund_exceeds_owed or request_id_reused.',
  })
  refund(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @Param('customerId') id: string,
    @Body({ schema: BillMoneyRequestSchema }) body: BillMoneyRequest,
  ): Promise<Bill> {
    return this.bills.refund(user, shop, customerId(id), body);
  }
}
