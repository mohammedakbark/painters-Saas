import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import {
  MyShopsController,
  ShopDiscoveryController,
} from './shop-discovery.controller.js';
import { ShopDiscoveryService } from './shop-discovery.service.js';

/** Finding shops and My Shops in the Customer App (CUS-002). */
@Module({
  imports: [PrismaModule],
  controllers: [ShopDiscoveryController, MyShopsController],
  providers: [ShopDiscoveryService],
})
export class ShopDiscoveryModule {}
