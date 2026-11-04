import {
  Body,
  Controller,
  Get,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiPayloadTooLargeResponse,
  ApiServiceUnavailableResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, type CurrentUserContext } from '../auth/current-user.js';
import { ProblemDetailsSchema } from '../common/http/problem-details.js';
import { IMAGE_LIMITS } from '../media/image-processor.js';
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
import { ShopPhotoService, type UploadedImage } from './shop-photo.service.js';
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
  constructor(
    private readonly profiles: ShopProfileService,
    private readonly photos: ShopPhotoService,
  ) {}

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

  @Put('photo')
  @ShopScoped()
  @UseInterceptors(
    FileInterceptor('photo', {
      // In memory: the image is re-encoded before anything is stored.
      limits: { fileSize: IMAGE_LIMITS.maxBytes, files: 1, fields: 0 },
    }),
  )
  @ApiOperation({
    summary:
      'Replace the shop photo (JPEG, PNG or WebP, at most 5 MB; re-encoded to WebP, metadata removed).',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['photo'],
      properties: { photo: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse({ standardSchema: ShopProfileResponseSchema })
  @ApiBadRequestResponse({ standardSchema: ProblemDetailsSchema })
  @ApiForbiddenResponse(OWNER_ONLY)
  @ApiPayloadTooLargeResponse({ standardSchema: ProblemDetailsSchema })
  @ApiServiceUnavailableResponse({ standardSchema: ProblemDetailsSchema })
  replacePhoto(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @UploadedFile() file: UploadedImage | undefined,
  ): Promise<ShopProfileResponse> {
    return this.photos.replace(user, shop, file);
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
