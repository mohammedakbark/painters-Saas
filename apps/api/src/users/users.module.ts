import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ShopAccessModule } from '../shop-access/shop-access.module.js';
import { CustomerProfileController } from './customer-profile.controller.js';
import { CustomerProfileService } from './customer-profile.service.js';
import { MeController } from './me.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [PrismaModule, ShopAccessModule],
  controllers: [MeController, CustomerProfileController],
  providers: [UsersService, CustomerProfileService],
  exports: [UsersService],
})
export class UsersModule {}
