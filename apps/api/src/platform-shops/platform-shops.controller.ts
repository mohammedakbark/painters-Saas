import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ProblemDetailsSchema } from '../common/http/problem-details.js';
import { PlatformAdminOnly } from '../platform-admin/platform-admin.guard.js';
import {
  type ShopRegistryEntry,
  ShopRegistryEntrySchema,
  type ShopRegistryPage,
  ShopRegistryPageSchema,
  type ShopRegistryQuery,
  ShopRegistryQuerySchema,
} from './platform-shops.schemas.js';
import { PlatformShopsService } from './platform-shops.service.js';

@ApiTags('platform')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ standardSchema: ProblemDetailsSchema })
@PlatformAdminOnly()
@Controller('platform/shops')
export class PlatformShopsController {
  constructor(private readonly shops: PlatformShopsService) {}

  @Get()
  @ApiOperation({
    summary: 'Registered shops, newest first (platform admins).',
  })
  @ApiOkResponse({ standardSchema: ShopRegistryPageSchema })
  @ApiBadRequestResponse({ standardSchema: ProblemDetailsSchema })
  list(
    @Query({ schema: ShopRegistryQuerySchema }) query: ShopRegistryQuery,
  ): Promise<ShopRegistryPage> {
    return this.shops.list(query);
  }

  @Get(':shopId')
  @ApiOperation({ summary: "A shop's registry entry (platform admins)." })
  @ApiOkResponse({ standardSchema: ShopRegistryEntrySchema })
  @ApiNotFoundResponse({ standardSchema: ProblemDetailsSchema })
  get(@Param('shopId') shopId: string): Promise<ShopRegistryEntry> {
    return this.shops.get(shopId);
  }
}
