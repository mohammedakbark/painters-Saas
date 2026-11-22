import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, type CurrentUserContext } from '../auth/current-user.js';
import { ProblemDetailsSchema } from '../common/http/problem-details.js';
import {
  type CreateCustomerSiteRequest,
  CreateCustomerSiteRequestSchema,
  type CustomerSite,
  type CustomerSiteList,
  type CustomerSiteListQuery,
  CustomerSiteListQuerySchema,
  CustomerSiteListSchema,
  CustomerSiteSchema,
  type SiteSpend,
  SiteSpendSchema,
  type UpdateCustomerSiteRequest,
  UpdateCustomerSiteRequestSchema,
} from './customer-sites.schemas.js';
import { CustomerSitesService } from './customer-sites.service.js';

const PROBLEM = { standardSchema: ProblemDetailsSchema } as const;
const PAINTER_ONLY = {
  standardSchema: ProblemDetailsSchema,
  description: 'painter_only: the caller is not a Painter/Contractor.',
} as const;
const NOT_FOUND = {
  standardSchema: ProblemDetailsSchema,
  description: "site_not_found: no such site among the caller's sites.",
} as const;

/** A painter's own work sites (CUS-005, D-049). */
@ApiTags('me')
@ApiBearerAuth()
@ApiUnauthorizedResponse(PROBLEM)
@ApiForbiddenResponse(PAINTER_ONLY)
@Controller('me/sites')
export class CustomerSitesController {
  constructor(private readonly sites: CustomerSitesService) {}

  @Get()
  @ApiOperation({
    summary: 'My sites by name, or the archived ones newest first.',
  })
  @ApiOkResponse({ standardSchema: CustomerSiteListSchema })
  list(
    @CurrentUser() user: CurrentUserContext,
    @Query({ schema: CustomerSiteListQuerySchema })
    query: CustomerSiteListQuery,
  ): Promise<CustomerSiteList> {
    return this.sites.list(user, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add a site with its name, address and map pin (D-049).',
  })
  @ApiCreatedResponse({ standardSchema: CustomerSiteSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiConflictResponse({
    standardSchema: ProblemDetailsSchema,
    description: 'site_name_taken or site_limit_reached (100 active sites).',
  })
  create(
    @CurrentUser() user: CurrentUserContext,
    @Body({ schema: CreateCustomerSiteRequestSchema })
    body: CreateCustomerSiteRequest,
  ): Promise<CustomerSite> {
    return this.sites.create(user, body);
  }

  @Get(':siteId')
  @ApiOperation({ summary: 'One of my sites.' })
  @ApiOkResponse({ standardSchema: CustomerSiteSchema })
  @ApiNotFoundResponse(NOT_FOUND)
  get(
    @CurrentUser() user: CurrentUserContext,
    @Param('siteId') siteId: string,
  ): Promise<CustomerSite> {
    return this.sites.get(user, siteId);
  }

  @Get(':siteId/spend')
  @ApiOperation({
    summary:
      "What a site has cost, by shop: each shop's total and latest orders, cancelled orders left out (CUS-007).",
  })
  @ApiOkResponse({ standardSchema: SiteSpendSchema })
  @ApiNotFoundResponse(NOT_FOUND)
  spend(
    @CurrentUser() user: CurrentUserContext,
    @Param('siteId') siteId: string,
  ): Promise<SiteSpend> {
    return this.sites.spend(user, siteId);
  }

  @Patch(':siteId')
  @ApiOperation({ summary: 'Change a site (not while archived).' })
  @ApiOkResponse({ standardSchema: CustomerSiteSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiNotFoundResponse(NOT_FOUND)
  @ApiConflictResponse({
    standardSchema: ProblemDetailsSchema,
    description: 'site_name_taken or site_archived.',
  })
  update(
    @CurrentUser() user: CurrentUserContext,
    @Param('siteId') siteId: string,
    @Body({ schema: UpdateCustomerSiteRequestSchema })
    body: UpdateCustomerSiteRequest,
  ): Promise<CustomerSite> {
    return this.sites.update(user, siteId, body);
  }

  @Post(':siteId/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Archive a finished site: it leaves the list and new orders, and keeps its history.',
  })
  @ApiOkResponse({ standardSchema: CustomerSiteSchema })
  @ApiNotFoundResponse(NOT_FOUND)
  archive(
    @CurrentUser() user: CurrentUserContext,
    @Param('siteId') siteId: string,
  ): Promise<CustomerSite> {
    return this.sites.setArchived(user, siteId, true);
  }

  @Post(':siteId/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bring an archived site back.' })
  @ApiOkResponse({ standardSchema: CustomerSiteSchema })
  @ApiNotFoundResponse(NOT_FOUND)
  @ApiConflictResponse({
    standardSchema: ProblemDetailsSchema,
    description:
      'site_name_taken (an active site has the same name) or site_limit_reached.',
  })
  restore(
    @CurrentUser() user: CurrentUserContext,
    @Param('siteId') siteId: string,
  ): Promise<CustomerSite> {
    return this.sites.setArchived(user, siteId, false);
  }
}
