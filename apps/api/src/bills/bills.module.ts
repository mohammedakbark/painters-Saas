import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ShopAccessModule } from '../shop-access/shop-access.module.js';
import { BillsController } from './bills.controller.js';
import { BillsService } from './bills.service.js';

/** Running bills and payments (BIL-001, D-062). */
@Module({
  imports: [PrismaModule, ShopAccessModule],
  controllers: [BillsController],
  providers: [BillsService],
})
export class BillsModule {}
