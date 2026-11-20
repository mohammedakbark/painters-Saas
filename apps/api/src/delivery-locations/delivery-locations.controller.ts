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
  type CreateDeliveryLocationRequest,
  CreateDeliveryLocationRequestSchema,
  type DeliveryLocation,
  type DeliveryLocationList,
  DeliveryLocationListSchema,
  DeliveryLocationSchema,
  type UpdateDeliveryLocationRequest,
  UpdateDeliveryLocationRequestSchema,
} from './delivery-locations.schemas.js';
import { DeliveryLocationsService } from './delivery-locations.service.js';

const PROBLEM = { standardSchema: ProblemDetailsSchema } as const;
const NOT_FOUND = {
  standardSchema: ProblemDetailsSchema,
  description:
    'delivery_location_not_found: no such active place among the callers places.',
} as const;

/** Saved delivery places for checkout (CUS-006, D-061). */
@ApiTags('me')
@ApiBearerAuth()
@ApiUnauthorizedResponse(PROBLEM)
@Controller('me/delivery-locations')
export class DeliveryLocationsController {
  constructor(private readonly locations: DeliveryLocationsService) {}

  @Get()
  @ApiOperation({ summary: 'My saved delivery places by name.' })
  @ApiOkResponse({ standardSchema: DeliveryLocationListSchema })
  list(@CurrentUser() user: CurrentUserContext): Promise<DeliveryLocationList> {
    return this.locations.list(user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Save a place with its address and map pin.' })
  @ApiCreatedResponse({ standardSchema: DeliveryLocationSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiConflictResponse({
    standardSchema: ProblemDetailsSchema,
    description:
      'delivery_location_label_taken or delivery_location_limit_reached (20).',
  })
  create(
    @CurrentUser() user: CurrentUserContext,
    @Body({ schema: CreateDeliveryLocationRequestSchema })
    body: CreateDeliveryLocationRequest,
  ): Promise<DeliveryLocation> {
    return this.locations.create(user, body);
  }

  @Patch(':locationId')
  @ApiOperation({ summary: 'Change a saved place.' })
  @ApiOkResponse({ standardSchema: DeliveryLocationSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiNotFoundResponse(NOT_FOUND)
  @ApiConflictResponse({
    standardSchema: ProblemDetailsSchema,
    description: 'delivery_location_label_taken.',
  })
  update(
    @CurrentUser() user: CurrentUserContext,
    @Param('locationId') locationId: string,
    @Body({ schema: UpdateDeliveryLocationRequestSchema })
    body: UpdateDeliveryLocationRequest,
  ): Promise<DeliveryLocation> {
    return this.locations.update(user, locationId, body);
  }

  @Post(':locationId/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a place from the list; past orders keep their copy.',
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse(NOT_FOUND)
  archive(
    @CurrentUser() user: CurrentUserContext,
    @Param('locationId') locationId: string,
  ): Promise<void> {
    return this.locations.archive(user, locationId);
  }
}
