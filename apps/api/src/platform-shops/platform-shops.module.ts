import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PlatformShopsController } from './platform-shops.controller.js';
import { PlatformShopsService } from './platform-shops.service.js';

@Module({
  imports: [PrismaModule, MediaModule],
  controllers: [PlatformShopsController],
  providers: [PlatformShopsService],
  exports: [PlatformShopsService],
})
export class PlatformShopsModule {}
