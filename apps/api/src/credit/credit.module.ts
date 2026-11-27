import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ShopAccessModule } from '../shop-access/shop-access.module.js';
import { CreditController } from './credit.controller.js';
import { CreditService } from './credit.service.js';

/** Shop credit (CRD-001, D-064). */
@Module({
  imports: [PrismaModule, ShopAccessModule],
  controllers: [CreditController],
  providers: [CreditService],
})
export class CreditModule {}
