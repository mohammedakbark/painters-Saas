import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
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
import { customerNotFound } from '../bills/bills.service.js';
import { ProblemDetailsSchema } from '../common/http/problem-details.js';
import {
  CurrentShop,
  type ShopContext,
  ShopScoped,
} from '../shop-access/shop-access.guard.js';
import {
  type Credit,
  type CreditChangeRequest,
  CreditChangeRequestSchema,
  type CreditQuery,
  CreditQuerySchema,
  CreditSchema,
  type IdCheckRequest,
  IdCheckRequestSchema,
} from './credit.schemas.js';
import { CreditService } from './credit.service.js';

const PROBLEM = { standardSchema: ProblemDetailsSchema } as const;
const uuid = z.uuid();

/** A malformed id is "not found", like another shop's id. */
const customerId = (value: string) => {
  if (!uuid.safeParse(value).success) throw customerNotFound();
  return value;
};

/** Each shop's credit with its customers (CRD-001, D-064). */
@ApiTags('credit')
@ApiBearerAuth()
@ApiUnauthorizedResponse(PROBLEM)
@ApiForbiddenResponse(PROBLEM)
@ApiNotFoundResponse(PROBLEM)
@Controller('shops/:shopId/customers/:customerId/credit')
export class CreditController {
  constructor(private readonly credit: CreditService) {}

  @Get()
  @ShopScoped()
  @ApiOperation({
    summary:
      "One customer's credit with this shop: limit, what they owe, the ID check and the history.",
  })
  @ApiOkResponse({ standardSchema: CreditSchema })
  read(
    @CurrentShop() shop: ShopContext,
    @Param('customerId') id: string,
    @Query({ schema: CreditQuerySchema }) query: CreditQuery,
  ): Promise<Credit> {
    return this.credit.credit(shop, customerId(id), query);
  }

  @Post('id-check')
  @ShopScoped()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Record that the shop saw the original ID: the type and last 4 characters only.',
  })
  @ApiOkResponse({ standardSchema: CreditSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiConflictResponse({
    standardSchema: ProblemDetailsSchema,
    description: 'request_id_reused.',
  })
  checkId(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @Param('customerId') id: string,
    @Body({ schema: IdCheckRequestSchema }) body: IdCheckRequest,
  ): Promise<Credit> {
    return this.credit.checkId(user, shop, customerId(id), body);
  }

  @Put()
  @ShopScoped()
  @ApiOperation({
    summary: 'Give credit, change the limit or stop credit, with a reason.',
  })
  @ApiOkResponse({ standardSchema: CreditSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiConflictResponse({
    standardSchema: ProblemDetailsSchema,
    description:
      'credit_needs_app_account, credit_needs_id_check, credit_already_active, credit_not_active or request_id_reused.',
  })
  change(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @Param('customerId') id: string,
    @Body({ schema: CreditChangeRequestSchema }) body: CreditChangeRequest,
  ): Promise<Credit> {
    return this.credit.changeCredit(user, shop, customerId(id), body);
  }
}
