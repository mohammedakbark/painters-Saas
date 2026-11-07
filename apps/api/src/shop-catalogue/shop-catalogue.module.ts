import { Module } from '@nestjs/common';
import { CatalogueModule } from '../catalogue/catalogue.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ShopAccessModule } from '../shop-access/shop-access.module.js';
import { ShopCatalogueController } from './shop-catalogue.controller.js';
import { ShopCategoriesController } from './shop-categories.controller.js';
import { ShopCategoriesService } from './shop-categories.service.js';
import { ShopProductsService } from './shop-products.service.js';
import { ShopShadesService } from './shop-shades.service.js';

/** The shop catalogue (CAT-002, ADR 0008). */
@Module({
  imports: [PrismaModule, ShopAccessModule, CatalogueModule],
  controllers: [ShopCatalogueController, ShopCategoriesController],
  providers: [ShopProductsService, ShopShadesService, ShopCategoriesService],
  exports: [ShopProductsService],
})
export class ShopCatalogueModule {}
