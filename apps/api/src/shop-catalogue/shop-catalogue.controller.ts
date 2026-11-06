import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiServiceUnavailableResponse,
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
  type AddShopPackRequest,
  AddShopPackRequestSchema,
  type AddShopProductRequest,
  AddShopProductRequestSchema,
  type BrandBrowsePage,
  BrandBrowsePageSchema,
  type BrandBrowseQuery,
  BrandBrowseQuerySchema,
  type BrandShadeBrowsePage,
  BrandShadeBrowsePageSchema,
  type BrandShadeBrowseQuery,
  BrandShadeBrowseQuerySchema,
  type CreateShopShadeRequest,
  CreateShopShadeRequestSchema,
  type FavouriteShade,
  type FavouriteShadePage,
  FavouriteShadePageSchema,
  FavouriteShadeSchema,
  type ShopPackRowPage,
  ShopPackRowPageSchema,
  type ShopPackRowQuery,
  ShopPackRowQuerySchema,
  type ShopProductListQuery,
  ShopProductListQuerySchema,
  type ShopProductPage,
  ShopProductPageSchema,
  type ShopProductResponse,
  ShopProductSchema,
  type ShopShadeListQuery,
  ShopShadeListQuerySchema,
  type ShopShadePage,
  ShopShadePageSchema,
  type ShopShadeResponse,
  ShopShadeSchema,
  type UpdateShopPackRequest,
  UpdateShopPackRequestSchema,
  type UpdateShopProductRequest,
  UpdateShopProductRequestSchema,
  type UpdateShopShadeRequest,
  UpdateShopShadeRequestSchema,
} from './shop-catalogue.schemas.js';
import { ShopProductsService } from './shop-products.service.js';
import { ShopShadesService } from './shop-shades.service.js';

const PROBLEM = { standardSchema: ProblemDetailsSchema } as const;
const OWNER_ONLY = {
  standardSchema: ProblemDetailsSchema,
  description:
    'The caller is a member but not allowed to change the catalogue.',
} as const;

interface UploadedBuffer {
  buffer: Buffer;
}

/**
 * The shop's catalogue (CAT-002): products with per-pack prices and
 * availability, favourite brand shades and the shop's own shades. Members
 * read; the owner writes (`CATALOGUE_MANAGER_ROLES`).
 */
@ApiTags('shop catalogue')
@ApiBearerAuth()
@ApiUnauthorizedResponse(PROBLEM)
@Controller('shops/:shopId/catalogue')
export class ShopCatalogueController {
  constructor(
    private readonly products: ShopProductsService,
    private readonly shades: ShopShadesService,
  ) {}

  // --- Products --------------------------------------------------------------

  @Get('products')
  @ShopScoped()
  @ApiOperation({ summary: "The shop's products, newest first." })
  @ApiOkResponse({ standardSchema: ShopProductPageSchema })
  @ApiBadRequestResponse(PROBLEM)
  listProducts(
    @CurrentShop() shop: ShopContext,
    @Query({ schema: ShopProductListQuerySchema }) query: ShopProductListQuery,
  ): Promise<ShopProductPage> {
    return this.products.list(shop, query);
  }

  @Get('pack-rows')
  @ShopScoped()
  @ApiOperation({
    summary:
      'One row per pack for the catalogue table: filtered, sorted and paged, with the filter options.',
  })
  @ApiOkResponse({ standardSchema: ShopPackRowPageSchema })
  @ApiBadRequestResponse(PROBLEM)
  listPackRows(
    @CurrentShop() shop: ShopContext,
    @Query({ schema: ShopPackRowQuerySchema }) query: ShopPackRowQuery,
  ): Promise<ShopPackRowPage> {
    return this.products.packRows(shop, query);
  }

  @Post('products')
  @ShopScoped()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Add a product from the brand catalogue, or an own product, with its pack prices.',
  })
  @ApiCreatedResponse({ standardSchema: ShopProductSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiForbiddenResponse(OWNER_ONLY)
  @ApiConflictResponse(PROBLEM)
  addProduct(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @Body({ schema: AddShopProductRequestSchema }) body: AddShopProductRequest,
  ): Promise<ShopProductResponse> {
    return this.products.add(user, shop, body);
  }

  @Get('products/:productId')
  @ShopScoped()
  @ApiOperation({ summary: 'One product of the shop.' })
  @ApiOkResponse({ standardSchema: ShopProductSchema })
  getProduct(
    @CurrentShop() shop: ShopContext,
    @Param('productId') productId: string,
  ): Promise<ShopProductResponse> {
    return this.products.get(shop, productId);
  }

  @Patch('products/:productId')
  @ShopScoped()
  @ApiOperation({
    summary:
      'Archive or restore a product; own products can also change name, brand, category and description.',
  })
  @ApiOkResponse({ standardSchema: ShopProductSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiForbiddenResponse(OWNER_ONLY)
  @ApiConflictResponse(PROBLEM)
  updateProduct(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @Param('productId') productId: string,
    @Body({ schema: UpdateShopProductRequestSchema })
    body: UpdateShopProductRequest,
  ): Promise<ShopProductResponse> {
    return this.products.update(user, shop, productId, body);
  }

  @Put('products/:productId/image')
  @ShopScoped()
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: IMAGE_LIMITS.maxBytes, files: 1, fields: 0 },
    }),
  )
  @ApiOperation({
    summary:
      "Replace the shop's own photo of the product (re-encoded to WebP, metadata removed).",
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image'],
      properties: { image: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse({ standardSchema: ShopProductSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiForbiddenResponse(OWNER_ONLY)
  @ApiPayloadTooLargeResponse(PROBLEM)
  @ApiServiceUnavailableResponse(PROBLEM)
  replaceProductImage(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @Param('productId') productId: string,
    @UploadedFile() file: UploadedBuffer | undefined,
  ): Promise<ShopProductResponse> {
    return this.products.replaceImage(user, shop, productId, file?.buffer);
  }

  @Post('products/:productId/packs')
  @ShopScoped()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a pack size with its price.' })
  @ApiCreatedResponse({ standardSchema: ShopProductSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiForbiddenResponse(OWNER_ONLY)
  @ApiConflictResponse(PROBLEM)
  addPack(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @Param('productId') productId: string,
    @Body({ schema: AddShopPackRequestSchema }) body: AddShopPackRequest,
  ): Promise<ShopProductResponse> {
    return this.products.addPack(user, shop, productId, body);
  }

  @Patch('products/:productId/packs/:packId')
  @ShopScoped()
  @ApiOperation({ summary: "Change a pack's price, MRP or availability." })
  @ApiOkResponse({ standardSchema: ShopProductSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiForbiddenResponse(OWNER_ONLY)
  updatePack(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @Param('productId') productId: string,
    @Param('packId') packId: string,
    @Body({ schema: UpdateShopPackRequestSchema }) body: UpdateShopPackRequest,
  ): Promise<ShopProductResponse> {
    return this.products.updatePack(user, shop, productId, packId, body);
  }

  @Delete('products/:productId/packs/:packId')
  @ShopScoped()
  @ApiOperation({
    summary: 'Stop selling a pack size (a product keeps at least one).',
  })
  @ApiOkResponse({ standardSchema: ShopProductSchema })
  @ApiForbiddenResponse(OWNER_ONLY)
  @ApiConflictResponse(PROBLEM)
  removePack(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @Param('productId') productId: string,
    @Param('packId') packId: string,
  ): Promise<ShopProductResponse> {
    return this.products.removePack(user, shop, productId, packId);
  }

  @Get('brand-products')
  @ShopScoped()
  @ApiOperation({
    summary:
      "A brand's catalogue products, each with the shop's listing id if it sells it.",
  })
  @ApiOkResponse({ standardSchema: BrandBrowsePageSchema })
  @ApiBadRequestResponse(PROBLEM)
  browseBrandProducts(
    @CurrentShop() shop: ShopContext,
    @Query({ schema: BrandBrowseQuerySchema }) query: BrandBrowseQuery,
  ): Promise<BrandBrowsePage> {
    return this.products.browseBrand(shop, query);
  }

  // --- Shades ----------------------------------------------------------------

  @Get('brand-shades')
  @ShopScoped()
  @ApiOperation({
    summary: "A brand's shades, each marked when it is a favourite.",
  })
  @ApiOkResponse({ standardSchema: BrandShadeBrowsePageSchema })
  @ApiBadRequestResponse(PROBLEM)
  browseBrandShades(
    @CurrentShop() shop: ShopContext,
    @Query({ schema: BrandShadeBrowseQuerySchema })
    query: BrandShadeBrowseQuery,
  ): Promise<BrandShadeBrowsePage> {
    return this.shades.browseBrand(shop, query.brandId, query);
  }

  @Get('favourite-shades')
  @ShopScoped()
  @ApiOperation({ summary: 'Favourite brand shades, by code.' })
  @ApiOkResponse({ standardSchema: FavouriteShadePageSchema })
  @ApiBadRequestResponse(PROBLEM)
  listFavourites(
    @CurrentShop() shop: ShopContext,
    @Query({ schema: ShopShadeListQuerySchema }) query: ShopShadeListQuery,
  ): Promise<FavouriteShadePage> {
    return this.shades.favourites(shop, query);
  }

  @Put('favourite-shades/:shadeId')
  @ShopScoped()
  @ApiOperation({ summary: 'Mark a brand shade as a favourite (idempotent).' })
  @ApiOkResponse({ standardSchema: FavouriteShadeSchema })
  @ApiForbiddenResponse(OWNER_ONLY)
  @ApiConflictResponse(PROBLEM)
  addFavourite(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @Param('shadeId') shadeId: string,
  ): Promise<FavouriteShade> {
    return this.shades.addFavourite(user, shop, shadeId);
  }

  @Delete('favourite-shades/:shadeId')
  @ShopScoped()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a favourite shade (idempotent).' })
  @ApiNoContentResponse()
  @ApiForbiddenResponse(OWNER_ONLY)
  removeFavourite(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @Param('shadeId') shadeId: string,
  ): Promise<void> {
    return this.shades.removeFavourite(user, shop, shadeId);
  }

  @Get('shades')
  @ShopScoped()
  @ApiOperation({ summary: "The shop's own shades, by code." })
  @ApiOkResponse({ standardSchema: ShopShadePageSchema })
  @ApiBadRequestResponse(PROBLEM)
  listOwnShades(
    @CurrentShop() shop: ShopContext,
    @Query({ schema: ShopShadeListQuerySchema }) query: ShopShadeListQuery,
  ): Promise<ShopShadePage> {
    return this.shades.ownShades(shop, query);
  }

  @Post('shades')
  @ShopScoped()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a shade of your own.' })
  @ApiCreatedResponse({ standardSchema: ShopShadeSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiForbiddenResponse(OWNER_ONLY)
  @ApiConflictResponse(PROBLEM)
  createOwnShade(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @Body({ schema: CreateShopShadeRequestSchema })
    body: CreateShopShadeRequest,
  ): Promise<ShopShadeResponse> {
    return this.shades.createOwn(user, shop, body);
  }

  @Patch('shades/:shadeId')
  @ShopScoped()
  @ApiOperation({ summary: 'Change a shade of your own.' })
  @ApiOkResponse({ standardSchema: ShopShadeSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiForbiddenResponse(OWNER_ONLY)
  @ApiConflictResponse(PROBLEM)
  updateOwnShade(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @Param('shadeId') shadeId: string,
    @Body({ schema: UpdateShopShadeRequestSchema })
    body: UpdateShopShadeRequest,
  ): Promise<ShopShadeResponse> {
    return this.shades.updateOwn(user, shop, shadeId, body);
  }

  @Delete('shades/:shadeId')
  @ShopScoped()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a shade of your own.' })
  @ApiNoContentResponse()
  @ApiForbiddenResponse(OWNER_ONLY)
  removeOwnShade(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @Param('shadeId') shadeId: string,
  ): Promise<void> {
    return this.shades.removeOwn(user, shop, shadeId);
  }
}
