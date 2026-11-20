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
  type CustomerProfileResponse,
  CustomerProfileResponseSchema,
  type UpdateCustomerProfileRequest,
  UpdateCustomerProfileRequestSchema,
} from './customer-profile.schemas.js';
import { CustomerProfileService } from './customer-profile.service.js';

const PROBLEM = { standardSchema: ProblemDetailsSchema } as const;

/** The caller's own Customer App profile (CUS-001, D-036). */
@ApiTags('me')
@ApiBearerAuth()
@ApiUnauthorizedResponse(PROBLEM)
@Controller('me/customer-profile')
export class CustomerProfileController {
  constructor(private readonly profiles: CustomerProfileService) {}

  @Get()
  @ApiOperation({
    summary: "The caller's Customer App profile: name and customer type.",
  })
  @ApiOkResponse({ standardSchema: CustomerProfileResponseSchema })
  get(
    @CurrentUser() user: CurrentUserContext,
  ): Promise<CustomerProfileResponse> {
    return this.profiles.get(user);
  }

  @Put()
  @ApiOperation({
    summary:
      'Set the name and the customer type (Painter/Contractor or Normal Customer). Changeable at any time.',
  })
  @ApiOkResponse({ standardSchema: CustomerProfileResponseSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiForbiddenResponse({
    standardSchema: ProblemDetailsSchema,
    description:
      'phone_verification_required: the caller did not sign in with a mobile number.',
  })
  update(
    @CurrentUser() user: CurrentUserContext,
    @Body({ schema: UpdateCustomerProfileRequestSchema })
    body: UpdateCustomerProfileRequest,
  ): Promise<CustomerProfileResponse> {
    return this.profiles.update(user, body);
  }
}
