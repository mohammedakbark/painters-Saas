import { Module } from '@nestjs/common';
import { DeliveryLocationsModule } from '../delivery-locations/delivery-locations.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CustomerOrdersController } from './customer-orders.controller.js';
import { CustomerOrdersService } from './customer-orders.service.js';

/** Checkout and My Orders in the Customer App (CUS-006). */
@Module({
  imports: [PrismaModule, OrdersModule, DeliveryLocationsModule],
  controllers: [CustomerOrdersController],
  providers: [CustomerOrdersService],
})
export class CustomerOrdersModule {}
