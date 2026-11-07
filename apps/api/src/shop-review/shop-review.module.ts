import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module.js';
import { PlatformShopsModule } from '../platform-shops/platform-shops.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ShopAccessModule } from '../shop-access/shop-access.module.js';
import { ShopCatalogueModule } from '../shop-catalogue/shop-catalogue.module.js';
import { ShopsModule } from '../shops/shops.module.js';
import { PlatformReviewsController } from './platform-reviews.controller.js';
import { PlatformReviewsService } from './platform-reviews.service.js';
import { ShopReviewController } from './shop-review.controller.js';
import { ShopReviewService } from './shop-review.service.js';

/** Shop review: submit, withdraw, approve or request changes (PLT-002). */
@Module({
  imports: [
    MediaModule,
    PrismaModule,
    ShopAccessModule,
    ShopsModule,
    ShopCatalogueModule,
    PlatformShopsModule,
  ],
  controllers: [ShopReviewController, PlatformReviewsController],
  providers: [ShopReviewService, PlatformReviewsService],
})
export class ShopReviewModule {}
