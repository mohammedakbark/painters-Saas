import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ShopAccessModule } from '../shop-access/shop-access.module.js';
import {
  ConnectRequestsController,
  MyConnectController,
} from './connect.controller.js';
import { ConnectService } from './connect.service.js';

/** Connecting a shop's records to a person's account (CON-001, D-063). */
@Module({
  imports: [PrismaModule, ShopAccessModule],
  controllers: [MyConnectController, ConnectRequestsController],
  providers: [ConnectService],
})
export class ConnectModule {}
