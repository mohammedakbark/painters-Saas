import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ShopAccessModule } from '../shop-access/shop-access.module.js';
import { MeController } from './me.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [PrismaModule, ShopAccessModule],
  controllers: [MeController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
