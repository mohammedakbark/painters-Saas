import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, type CurrentUserContext } from '../auth/current-user.js';
import { ProblemDetailsSchema } from '../common/http/problem-details.js';
import { ShopMembershipsService } from '../shop-access/shop-memberships.service.js';
import { type MeResponse, MeResponseSchema } from './me.schema.js';

@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly memberships: ShopMembershipsService) {}

  @Get()
  @ApiOperation({
    summary: 'The authenticated caller, their platform role and their shops.',
  })
  @ApiOkResponse({ standardSchema: MeResponseSchema })
  @ApiUnauthorizedResponse({ standardSchema: ProblemDetailsSchema })
  async me(@CurrentUser() user: CurrentUserContext): Promise<MeResponse> {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      displayName: user.displayName,
      platformRole: user.platformRole,
      shopMemberships: await this.memberships.listForUser(user.id),
    };
  }
}
