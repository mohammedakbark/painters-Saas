import { Body, Controller, Get, Put } from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
  type ShopSettingsResponse,
  ShopSettingsResponseSchema,
  type UpdateDeliverySettingsRequest,
  UpdateDeliverySettingsRequestSchema,
  type UpdateOrderMessagesRequest,
  UpdateOrderMessagesRequestSchema,
} from './shop-settings.schemas.js';
import { ShopSettingsService } from './shop-settings.service.js';

const PROBLEM = { standardSchema: ProblemDetailsSchema } as const;
const OWNER_ONLY = {
  standardSchema: ProblemDetailsSchema,
  description: 'The caller is a member but not allowed to change settings.',
} as const;

/** Shop settings: delivery and order messages (SHP-008). */
@ApiTags('shops')
@ApiBearerAuth()
@ApiUnauthorizedResponse(PROBLEM)
@Controller('shops/:shopId/settings')
export class ShopSettingsController {
  constructor(private readonly settings: ShopSettingsService) {}

  @Get()
  @ShopScoped()
  @ApiOperation({ summary: 'Delivery settings and order messages.' })
  @ApiOkResponse({ standardSchema: ShopSettingsResponseSchema })
  get(@CurrentShop() shop: ShopContext): Promise<ShopSettingsResponse> {
    return this.settings.get(shop);
  }

  @Put('delivery')
  @ShopScoped()
  @ApiOperation({
    summary:
      'Turn delivery on or off with its flat charge, free-delivery amount and distance (km from the shop location).',
  })
  @ApiOkResponse({ standardSchema: ShopSettingsResponseSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiForbiddenResponse(OWNER_ONLY)
  @ApiConflictResponse({
    standardSchema: ProblemDetailsSchema,
    description: 'delivery_needs_location: the shop has no map location yet.',
  })
  updateDelivery(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @Body({ schema: UpdateDeliverySettingsRequestSchema })
    body: UpdateDeliverySettingsRequest,
  ): Promise<ShopSettingsResponse> {
    return this.settings.updateDelivery(user, shop, body);
  }

  @Put('order-messages')
  @ShopScoped()
  @ApiOperation({
    summary:
      'Replace the ready-made messages for items that are not available (at most 10).',
  })
  @ApiOkResponse({ standardSchema: ShopSettingsResponseSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiForbiddenResponse(OWNER_ONLY)
  updateOrderMessages(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @Body({ schema: UpdateOrderMessagesRequestSchema })
    body: UpdateOrderMessagesRequest,
  ): Promise<ShopSettingsResponse> {
    return this.settings.updateOrderMessages(user, shop, body);
  }
}
