import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, type CurrentUserContext } from '../auth/current-user.js';
import { ProblemDetailsSchema } from '../common/http/problem-details.js';
import {
  type FindShopsPage,
  FindShopsPageSchema,
  type FindShopsQuery,
  FindShopsQuerySchema,
  type MyShopsList,
  MyShopsListSchema,
  type NearQuery,
  NearQuerySchema,
  type PublicShop,
  PublicShopSchema,
  type ShopDistricts,
  ShopDistrictsSchema,
} from './shop-discovery.schemas.js';
import { ShopDiscoveryService } from './shop-discovery.service.js';
import {
  type StorefrontCategories,
  StorefrontCategoriesSchema,
  type StorefrontPage,
  StorefrontPageSchema,
  type StorefrontProduct,
  StorefrontProductSchema,
  type StorefrontQuery,
  StorefrontQuerySchema,
} from './storefront.schemas.js';
import { StorefrontService } from './storefront.service.js';

const PROBLEM = { standardSchema: ProblemDetailsSchema } as const;
const NOT_FOUND = {
  standardSchema: ProblemDetailsSchema,
  description: 'shop_not_found: no Live shop has this id.',
} as const;

/** Finding Live shops in the Customer App (CUS-002, D-037, D-038). */
@ApiTags('discover')
@ApiBearerAuth()
@ApiUnauthorizedResponse(PROBLEM)
@Controller('discover/shops')
export class ShopDiscoveryController {
  constructor(private readonly discovery: ShopDiscoveryService) {}

  @Get()
  @ApiOperation({
    summary:
      'Live shops: nearest first with lat/lng, the chosen district first without them, otherwise by name. The position is only used to sort.',
  })
  @ApiOkResponse({ standardSchema: FindShopsPageSchema })
  @ApiBadRequestResponse(PROBLEM)
  find(
    @CurrentUser() user: CurrentUserContext,
    @Query({ schema: FindShopsQuerySchema }) query: FindShopsQuery,
  ): Promise<FindShopsPage> {
    return this.discovery.find(user, query);
  }

  @Get('districts')
  @ApiOperation({ summary: 'Districts that have Live shops, by name.' })
  @ApiOkResponse({ standardSchema: ShopDistrictsSchema })
  districts(): Promise<ShopDistricts> {
    return this.discovery.districts();
  }

  @Get(':shopId')
  @ApiOperation({ summary: "A Live shop's public page." })
  @ApiOkResponse({ standardSchema: PublicShopSchema })
  @ApiNotFoundResponse(NOT_FOUND)
  get(
    @CurrentUser() user: CurrentUserContext,
    @Param('shopId') shopId: string,
    @Query({ schema: NearQuerySchema }) query: NearQuery,
  ): Promise<PublicShop> {
    return this.discovery.get(user, shopId, query);
  }
}

/** The caller's private My Shops list (CUS-002, D-037). */
@ApiTags('me')
@ApiBearerAuth()
@ApiUnauthorizedResponse(PROBLEM)
@Controller('me/shops')
export class MyShopsController {
  constructor(private readonly discovery: ShopDiscoveryService) {}

  @Get()
  @ApiOperation({ summary: 'My Shops, most recently added first.' })
  @ApiOkResponse({ standardSchema: MyShopsListSchema })
  list(
    @CurrentUser() user: CurrentUserContext,
    @Query({ schema: NearQuerySchema }) query: NearQuery,
  ): Promise<MyShopsList> {
    return this.discovery.myShops(user, query);
  }

  @Put(':shopId')
  @ApiOperation({
    summary:
      'Add a Live shop to My Shops (instant, no approval). The shop is not told.',
  })
  @ApiOkResponse({ standardSchema: PublicShopSchema })
  @ApiNotFoundResponse(NOT_FOUND)
  add(
    @CurrentUser() user: CurrentUserContext,
    @Param('shopId') shopId: string,
  ): Promise<PublicShop> {
    return this.discovery.add(user, shopId);
  }

  @Delete(':shopId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a shop from My Shops.' })
  @ApiNoContentResponse({ description: 'Removed, or was not in My Shops.' })
  remove(
    @CurrentUser() user: CurrentUserContext,
    @Param('shopId') shopId: string,
  ): Promise<void> {
    return this.discovery.remove(user, shopId);
  }
}

/** A Live shop's storefront (CUS-003): browse only, no adding needed. */
@ApiTags('discover')
@ApiBearerAuth()
@ApiUnauthorizedResponse(PROBLEM)
@Controller('discover/shops/:shopId')
export class StorefrontController {
  constructor(private readonly storefront: StorefrontService) {}

  @Get('categories')
  @ApiOperation({
    summary: 'Categories that have products in this shop, with counts.',
  })
  @ApiOkResponse({ standardSchema: StorefrontCategoriesSchema })
  @ApiNotFoundResponse(NOT_FOUND)
  categories(@Param('shopId') shopId: string): Promise<StorefrontCategories> {
    return this.storefront.categories(shopId);
  }

  @Get('products')
  @ApiOperation({
    summary:
      "The shop's products by name, with pack sizes, prices and availability.",
  })
  @ApiOkResponse({ standardSchema: StorefrontPageSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiNotFoundResponse(NOT_FOUND)
  products(
    @Param('shopId') shopId: string,
    @Query({ schema: StorefrontQuerySchema }) query: StorefrontQuery,
  ): Promise<StorefrontPage> {
    return this.storefront.products(shopId, query);
  }

  @Get('products/:productId')
  @ApiOperation({ summary: 'One product of the shop.' })
  @ApiOkResponse({ standardSchema: StorefrontProductSchema })
  @ApiNotFoundResponse({
    standardSchema: ProblemDetailsSchema,
    description:
      'shop_not_found or product_not_found (archived, hidden or not in this shop).',
  })
  product(
    @Param('shopId') shopId: string,
    @Param('productId') productId: string,
  ): Promise<StorefrontProduct> {
    return this.storefront.product(shopId, productId);
  }
}
