import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ShopAccessModule } from '../shop-access/shop-access.module.js';
import { OrderPlacementService } from './order-placement.service.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

/** Orders (ORD-001, D-045 to D-047, D-053, D-054). */
@Module({
  imports: [PrismaModule, ShopAccessModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderPlacementService],
  exports: [OrderPlacementService],
})
export class OrdersModule {}
