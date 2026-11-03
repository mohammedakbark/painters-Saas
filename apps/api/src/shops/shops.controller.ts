import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
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
  type MyShopResponse,
  MyShopResponseSchema,
  type RegisterShopRequest,
  RegisterShopRequestSchema,
} from './shop.schemas.js';
import { ShopsService } from './shops.service.js';

@ApiTags('shops')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ standardSchema: ProblemDetailsSchema })
@Controller('shops')
export class ShopsController {
  constructor(private readonly shops: ShopsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a shop. The caller becomes its master account.',
  })
  @ApiCreatedResponse({ standardSchema: MyShopResponseSchema })
  @ApiBadRequestResponse({ standardSchema: ProblemDetailsSchema })
  @ApiForbiddenResponse({
    standardSchema: ProblemDetailsSchema,
    description: 'The account has no verified mobile number.',
  })
  register(
    @CurrentUser() user: CurrentUserContext,
    @Body({ schema: RegisterShopRequestSchema }) body: RegisterShopRequest,
  ): Promise<MyShopResponse> {
    return this.shops.register(user, body);
  }

  @Get(':shopId')
  @ShopScoped()
  @ApiOperation({ summary: 'A shop the caller is a member of.' })
  @ApiOkResponse({ standardSchema: MyShopResponseSchema })
  get(@CurrentShop() shop: ShopContext): Promise<MyShopResponse> {
    return this.shops.getForMember(shop);
  }
}
