import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ShopAccessModule } from '../shop-access/shop-access.module.js';
import { BillsController } from './bills.controller.js';
import { BillsService } from './bills.service.js';
import { MyBillsController } from './my-bills.controller.js';
import { MyBillsService } from './my-bills.service.js';

/** Running bills and payments (BIL-001), and the customer's own (BIL-003). */
@Module({
  imports: [PrismaModule, ShopAccessModule],
  controllers: [BillsController, MyBillsController],
  providers: [BillsService, MyBillsService],
})
export class BillsModule {}
