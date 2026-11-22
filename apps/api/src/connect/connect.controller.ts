import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
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
  CurrentShop,
  type ShopContext,
  ShopScoped,
} from '../shop-access/shop-access.guard.js';
import {
  type ConnectDecision,
  ConnectDecisionSchema,
  type ConnectRequestList,
  ConnectRequestListSchema,
  type MyConnectRequest,
  MyConnectRequestSchema,
} from './connect.schemas.js';
import { ConnectService } from './connect.service.js';

const PROBLEM = { standardSchema: ProblemDetailsSchema } as const;

/** The person asks a shop to connect its records (CON-001, D-063). */
@ApiTags('me')
@ApiBearerAuth()
@ApiUnauthorizedResponse(PROBLEM)
@ApiNotFoundResponse(PROBLEM)
@Controller('me/shops/:shopId/connect')
export class MyConnectController {
  constructor(private readonly connect: ConnectService) {}

  @Get()
  @ApiOperation({
    summary:
      'My latest request to this shop. It never says whether the shop has a record of my mobile.',
  })
  @ApiOkResponse({ standardSchema: MyConnectRequestSchema })
  get(
    @CurrentUser() user: CurrentUserContext,
    @Param('shopId') shopId: string,
  ): Promise<MyConnectRequest> {
    return this.connect.myRequest(user, shopId);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Ask the shop to connect the records it keeps of my verified mobile to my account.',
  })
  @ApiOkResponse({ standardSchema: MyConnectRequestSchema })
  @ApiConflictResponse(PROBLEM)
  ask(
    @CurrentUser() user: CurrentUserContext,
    @Param('shopId') shopId: string,
  ): Promise<MyConnectRequest> {
    return this.connect.ask(user, shopId);
  }
}

/** The shop answers connection requests (CON-001, D-063). */
@ApiTags('customers')
@ApiBearerAuth()
@ApiUnauthorizedResponse(PROBLEM)
@ApiForbiddenResponse(PROBLEM)
@Controller('shops/:shopId/connect-requests')
export class ConnectRequestsController {
  constructor(private readonly connect: ConnectService) {}

  @Get()
  @ShopScoped()
  @ApiOperation({
    summary:
      'Open requests from app users whose verified mobile matches one of your own records.',
  })
  @ApiOkResponse({ standardSchema: ConnectRequestListSchema })
  list(@CurrentShop() shop: ShopContext): Promise<ConnectRequestList> {
    return this.connect.list(shop);
  }

  @Post(':requestId/approve')
  @ShopScoped()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Connect your record to the person's account; merges it into their app record when they already order here.",
  })
  @ApiOkResponse({ standardSchema: ConnectDecisionSchema })
  @ApiNotFoundResponse(PROBLEM)
  approve(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @Param('requestId') requestId: string,
  ): Promise<ConnectDecision> {
    return this.connect.approve(user, shop, requestId);
  }

  @Post(':requestId/decline')
  @ShopScoped()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Decline a request; your records stay private.' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse(PROBLEM)
  decline(
    @CurrentUser() user: CurrentUserContext,
    @CurrentShop() shop: ShopContext,
    @Param('requestId') requestId: string,
  ): Promise<void> {
    return this.connect.decline(user, shop, requestId);
  }
}
