import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, type CurrentUserContext } from '../auth/current-user.js';
import { ProblemDetailsSchema } from '../common/http/problem-details.js';
import {
  type MyBill,
  type MyBillList,
  MyBillListSchema,
  type MyBillQuery,
  MyBillQuerySchema,
  MyBillSchema,
} from './my-bills.schemas.js';
import { MyBillsService } from './my-bills.service.js';

const PROBLEM = { standardSchema: ProblemDetailsSchema } as const;

/** The caller's own running bills with shops (BIL-003, D-062). */
@ApiTags('me')
@ApiBearerAuth()
@ApiUnauthorizedResponse(PROBLEM)
@Controller('me/bills')
export class MyBillsController {
  constructor(private readonly bills: MyBillsService) {}

  @Get()
  @ApiOperation({
    summary: 'My bill with each shop, most owed first.',
  })
  @ApiOkResponse({ standardSchema: MyBillListSchema })
  list(@CurrentUser() user: CurrentUserContext): Promise<MyBillList> {
    return this.bills.list(user);
  }

  @Get(':shopId')
  @ApiOperation({
    summary:
      'My bill with one shop: balance, billed by site and entries, newest first.',
  })
  @ApiOkResponse({ standardSchema: MyBillSchema })
  @ApiNotFoundResponse({
    standardSchema: ProblemDetailsSchema,
    description: 'bill_not_found: the caller has no record with this shop.',
  })
  bill(
    @CurrentUser() user: CurrentUserContext,
    @Param('shopId') shopId: string,
    @Query({ schema: MyBillQuerySchema }) query: MyBillQuery,
  ): Promise<MyBill> {
    return this.bills.bill(user, shopId, query);
  }
}
