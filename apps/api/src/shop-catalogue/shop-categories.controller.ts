import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
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
  CurrentShop,
  type ShopContext,
  ShopScoped,
} from '../shop-access/shop-access.guard.js';
import {
  type CreateShopCategoryRequest,
  CreateShopCategoryRequestSchema,
  type ShopCategoryList,
  ShopCategoryListSchema,
  type ShopCategoryResponse,
  ShopCategorySchema,
  type UpdateShopCategoryRequest,
  UpdateShopCategoryRequestSchema,
} from './shop-categories.schemas.js';
import { ShopCategoriesService } from './shop-categories.service.js';

const PROBLEM = { standardSchema: ProblemDetailsSchema } as const;
const OWNER_ONLY = {
  standardSchema: ProblemDetailsSchema,
  description:
    'The caller is a member but not allowed to change the catalogue.',
} as const;

/** The platform's categories and the shop's own (CAT-007, D-048). */
@ApiTags('shop catalogue')
@ApiBearerAuth()
@ApiUnauthorizedResponse(PROBLEM)
@Controller('shops/:shopId/catalogue/categories')
export class ShopCategoriesController {
  constructor(private readonly categories: ShopCategoriesService) {}

  @Get()
  @ShopScoped()
  @ApiOperation({
    summary:
      "Active platform categories and the shop's own categories, with the shop's product count for each.",
  })
  @ApiOkResponse({ standardSchema: ShopCategoryListSchema })
  list(@CurrentShop() shop: ShopContext): Promise<ShopCategoryList> {
    return this.categories.list(shop);
  }

  @Post()
  @ShopScoped()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a category that only this shop uses.' })
  @ApiCreatedResponse({ standardSchema: ShopCategorySchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiForbiddenResponse(OWNER_ONLY)
  @ApiConflictResponse({
    standardSchema: ProblemDetailsSchema,
    description:
      'category_name_taken (same name as a platform or own category) or shop_category_limit.',
  })
  create(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @Body({ schema: CreateShopCategoryRequestSchema })
    body: CreateShopCategoryRequest,
  ): Promise<ShopCategoryResponse> {
    return this.categories.create(user, shop, body);
  }

  @Patch(':categoryId')
  @ShopScoped()
  @ApiOperation({
    summary: "Rename, archive or restore one of the shop's own categories.",
  })
  @ApiOkResponse({ standardSchema: ShopCategorySchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiForbiddenResponse(OWNER_ONLY)
  @ApiNotFoundResponse(PROBLEM)
  @ApiConflictResponse(PROBLEM)
  update(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @Param('categoryId') categoryId: string,
    @Body({ schema: UpdateShopCategoryRequestSchema })
    body: UpdateShopCategoryRequest,
  ): Promise<ShopCategoryResponse> {
    return this.categories.update(user, shop, categoryId, body);
  }
}
