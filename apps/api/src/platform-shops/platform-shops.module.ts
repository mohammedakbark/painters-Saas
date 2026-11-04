import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PlatformShopsController } from './platform-shops.controller.js';
import { PlatformShopsService } from './platform-shops.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [PlatformShopsController],
  providers: [PlatformShopsService],
  exports: [PlatformShopsService],
})
export class PlatformShopsModule {}
