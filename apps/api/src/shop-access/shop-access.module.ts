import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ShopAccessGuard } from './shop-access.guard.js';
import { ShopMembershipsService } from './shop-memberships.service.js';

/** Import this module in every module that has `@ShopScoped()` routes. */
@Module({
  imports: [PrismaModule],
  providers: [ShopMembershipsService, ShopAccessGuard],
  exports: [ShopMembershipsService, ShopAccessGuard],
})
export class ShopAccessModule {}
