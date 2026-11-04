import { Body, Controller, Get, Put } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
  type ShopLocationInput,
  ShopLocationInputSchema,
  type ShopOnboardingResponse,
  ShopOnboardingResponseSchema,
  type ShopProfileResponse,
  ShopProfileResponseSchema,
  type UpdateShopProfileRequest,
  UpdateShopProfileRequestSchema,
} from './shop-profile.schemas.js';
import { ShopProfileService } from './shop-profile.service.js';

const OWNER_ONLY = {
  standardSchema: ProblemDetailsSchema,
  description: 'The caller is a member but not allowed to change the profile.',
} as const;

/** Shop profile, location and onboarding checklist (SHP-003). */
@ApiTags('shops')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ standardSchema: ProblemDetailsSchema })
@Controller('shops/:shopId')
export class ShopProfileController {
  constructor(private readonly profiles: ShopProfileService) {}

  @Get('profile')
  @ShopScoped()
  @ApiOperation({
    summary: 'The shop profile: support mobile, address, map location.',
  })
  @ApiOkResponse({ standardSchema: ShopProfileResponseSchema })
  get(@CurrentShop() shop: ShopContext): Promise<ShopProfileResponse> {
    return this.profiles.get(shop);
  }

  @Put('profile')
  @ShopScoped()
  @ApiOperation({
    summary:
      'Replace the support mobile and address; optionally set the location.',
  })
  @ApiOkResponse({ standardSchema: ShopProfileResponseSchema })
  @ApiBadRequestResponse({ standardSchema: ProblemDetailsSchema })
  @ApiForbiddenResponse(OWNER_ONLY)
  update(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @Body({ schema: UpdateShopProfileRequestSchema })
    body: UpdateShopProfileRequest,
  ): Promise<ShopProfileResponse> {
    return this.profiles.update(user, shop, body);
  }

  @Put('location')
  @ShopScoped()
  @ApiOperation({ summary: 'Set the shop location only.' })
  @ApiOkResponse({ standardSchema: ShopProfileResponseSchema })
  @ApiBadRequestResponse({ standardSchema: ProblemDetailsSchema })
  @ApiForbiddenResponse(OWNER_ONLY)
  updateLocation(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @Body({ schema: ShopLocationInputSchema }) body: ShopLocationInput,
  ): Promise<ShopProfileResponse> {
    return this.profiles.updateLocation(user, shop, body);
  }

  @Get('onboarding')
  @ShopScoped()
  @ApiOperation({ summary: 'Onboarding checklist: what is done and missing.' })
  @ApiOkResponse({ standardSchema: ShopOnboardingResponseSchema })
  onboarding(
    @CurrentShop() shop: ShopContext,
  ): Promise<ShopOnboardingResponse> {
    return this.profiles.onboarding(shop);
  }
}
