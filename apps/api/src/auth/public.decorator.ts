import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_ROUTE = 'auth:isPublicRoute';

/**
 * Opts a route (or controller) out of authentication. Every other route
 * requires a valid access token (deny by default, ADR 0006).
 */
export const Public = () => SetMetadata(IS_PUBLIC_ROUTE, true);
