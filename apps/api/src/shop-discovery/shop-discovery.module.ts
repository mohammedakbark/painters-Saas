import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import {
  MyShopsController,
  ShopDiscoveryController,
  StorefrontController,
} from './shop-discovery.controller.js';
import { ShopDiscoveryService } from './shop-discovery.service.js';
import { StorefrontService } from './storefront.service.js';

/** Finding shops, My Shops (CUS-002) and the storefront (CUS-003). */
@Module({
  imports: [PrismaModule],
  controllers: [
    ShopDiscoveryController,
    StorefrontController,
    MyShopsController,
  ],
  providers: [ShopDiscoveryService, StorefrontService],
})
export class ShopDiscoveryModule {}
