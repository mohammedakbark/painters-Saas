import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CatalogueAdminService } from './catalogue-admin.service.js';
import { CatalogueImportService } from './catalogue-import.service.js';
import { CatalogueReadService } from './catalogue-read.service.js';
import { CatalogueController } from './catalogue.controller.js';
import { PlatformCatalogueController } from './platform-catalogue.controller.js';

/** The shared brand catalogue (CAT-001, D-030). */
@Module({
  imports: [PrismaModule],
  controllers: [PlatformCatalogueController, CatalogueController],
  providers: [
    CatalogueAdminService,
    CatalogueImportService,
    CatalogueReadService,
  ],
  exports: [CatalogueReadService],
})
export class CatalogueModule {}
