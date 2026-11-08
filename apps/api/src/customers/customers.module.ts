import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ShopAccessModule } from '../shop-access/shop-access.module.js';
import { CustomersController } from './customers.controller.js';
import { CustomersService } from './customers.service.js';

/** The shop's customers and painters' sites (ORD-004, D-054, D-055). */
@Module({
  imports: [PrismaModule, ShopAccessModule],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
