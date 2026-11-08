import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { z } from 'zod';
import { CurrentUser, type CurrentUserContext } from '../auth/current-user.js';
import { ProblemDetailsSchema } from '../common/http/problem-details.js';
import {
  CurrentShop,
  type ShopContext,
  ShopScoped,
} from '../shop-access/shop-access.guard.js';
import {
  type CreateCustomerRequest,
  CreateCustomerRequestSchema,
  type CreateSiteRequest,
  CreateSiteRequestSchema,
  type CustomerDetail,
  CustomerDetailSchema,
  type CustomerListPage,
  CustomerListPageSchema,
  type CustomerListQuery,
  CustomerListQuerySchema,
  type SiteResponse,
  SiteSchema,
  type UpdateCustomerRequest,
  UpdateCustomerRequestSchema,
  type UpdateSiteRequest,
  UpdateSiteRequestSchema,
} from './customers.schemas.js';
import {
  customerNotFound,
  CustomersService,
  siteNotFound,
} from './customers.service.js';

const PROBLEM = { standardSchema: ProblemDetailsSchema } as const;
const uuid = z.uuid();

/** A malformed id is "not found", like another shop's id. */
const customerId = (value: string) => {
  if (!uuid.safeParse(value).success) throw customerNotFound();
  return value;
};
const siteId = (value: string) => {
  if (!uuid.safeParse(value).success) throw siteNotFound();
  return value;
};

/** The shop's customers and painters' sites (ORD-004, D-054, D-055). */
@ApiTags('customers')
@ApiBearerAuth()
@ApiUnauthorizedResponse(PROBLEM)
@ApiNotFoundResponse(PROBLEM)
@Controller('shops/:shopId/customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @ShopScoped()
  @ApiOperation({
    summary:
      "The shop's customers (recorded by the shop or ordering in the app), with sites and orders counts.",
  })
  @ApiOkResponse({ standardSchema: CustomerListPageSchema })
  @ApiBadRequestResponse(PROBLEM)
  list(
    @CurrentShop() shop: ShopContext,
    @Query({ schema: CustomerListQuerySchema }) query: CustomerListQuery,
  ): Promise<CustomerListPage> {
    return this.customers.list(shop, query);
  }

  @Post()
  @ShopScoped()
  @ApiOperation({
    summary:
      'Record a customer by mobile number. Private to the shop; the person is not told (D-054).',
  })
  @ApiCreatedResponse({ standardSchema: CustomerDetailSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiConflictResponse({
    standardSchema: ProblemDetailsSchema,
    description: 'customer_phone_taken: this mobile is already recorded.',
  })
  create(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @Body({ schema: CreateCustomerRequestSchema }) body: CreateCustomerRequest,
  ): Promise<CustomerDetail> {
    return this.customers.create(user, shop, body);
  }

  @Get(':customerId')
  @ShopScoped()
  @ApiOperation({ summary: 'One customer with their sites.' })
  @ApiOkResponse({ standardSchema: CustomerDetailSchema })
  detail(
    @CurrentShop() shop: ShopContext,
    @Param('customerId') id: string,
  ): Promise<CustomerDetail> {
    return this.customers.detail(shop, customerId(id));
  }

  @Patch(':customerId')
  @ShopScoped()
  @ApiOperation({
    summary:
      'Change the name or type; the mobile only for customers the shop recorded.',
  })
  @ApiOkResponse({ standardSchema: CustomerDetailSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiConflictResponse(PROBLEM)
  update(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @Param('customerId') id: string,
    @Body({ schema: UpdateCustomerRequestSchema }) body: UpdateCustomerRequest,
  ): Promise<CustomerDetail> {
    return this.customers.update(user, shop, customerId(id), body);
  }

  @Post(':customerId/sites')
  @ShopScoped()
  @ApiOperation({
    summary:
      'Add a site for a painter the shop recorded: name, owner, address and an optional map pin.',
  })
  @ApiCreatedResponse({ standardSchema: SiteSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiConflictResponse(PROBLEM)
  createSite(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @Param('customerId') id: string,
    @Body({ schema: CreateSiteRequestSchema }) body: CreateSiteRequest,
  ): Promise<SiteResponse> {
    return this.customers.createSite(user, shop, customerId(id), body);
  }

  @Patch(':customerId/sites/:siteId')
  @ShopScoped()
  @ApiOperation({ summary: 'Change, archive or restore a site.' })
  @ApiOkResponse({ standardSchema: SiteSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiConflictResponse(PROBLEM)
  updateSite(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @Param('customerId') id: string,
    @Param('siteId') site: string,
    @Body({ schema: UpdateSiteRequestSchema }) body: UpdateSiteRequest,
  ): Promise<SiteResponse> {
    return this.customers.updateSite(
      user,
      shop,
      customerId(id),
      siteId(site),
      body,
    );
  }
}
