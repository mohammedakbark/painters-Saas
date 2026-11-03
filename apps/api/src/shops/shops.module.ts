import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ShopAccessModule } from '../shop-access/shop-access.module.js';
import { ShopsController } from './shops.controller.js';
import { ShopsService } from './shops.service.js';

@Module({
  imports: [PrismaModule, ShopAccessModule],
  controllers: [ShopsController],
  providers: [ShopsService],
})
export class ShopsModule {}
