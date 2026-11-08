import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PlatformShopsController } from './platform-shops.controller.js';
import { PlatformShopsService } from './platform-shops.service.js';
import {
  PlatformSummaryController,
  PlatformSummaryService,
} from './platform-summary.js';

@Module({
  imports: [PrismaModule, MediaModule],
  controllers: [PlatformShopsController, PlatformSummaryController],
  providers: [PlatformShopsService, PlatformSummaryService],
  exports: [PlatformShopsService],
})
export class PlatformShopsModule {}
