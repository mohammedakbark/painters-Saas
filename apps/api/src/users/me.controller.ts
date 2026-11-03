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
import { type MeResponse, MeResponseSchema } from './me.schema.js';

@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  @Get()
  @ApiOperation({ summary: 'The authenticated caller and their roles.' })
  @ApiOkResponse({ standardSchema: MeResponseSchema })
  @ApiUnauthorizedResponse({ standardSchema: ProblemDetailsSchema })
  me(@CurrentUser() user: CurrentUserContext): MeResponse {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      displayName: user.displayName,
      platformRole: user.platformRole,
    };
  }
}
