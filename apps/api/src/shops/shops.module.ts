import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ShopAccessModule } from '../shop-access/shop-access.module.js';
import { ShopPhotoService } from './shop-photo.service.js';
import { ShopProfileController } from './shop-profile.controller.js';
import { ShopProfileService } from './shop-profile.service.js';
import { ShopSettingsController } from './shop-settings.controller.js';
import { ShopSettingsService } from './shop-settings.service.js';
import { ShopsController } from './shops.controller.js';
import { ShopsService } from './shops.service.js';

@Module({
  imports: [PrismaModule, ShopAccessModule],
  controllers: [ShopsController, ShopProfileController, ShopSettingsController],
  providers: [
    ShopsService,
    ShopProfileService,
    ShopPhotoService,
    ShopSettingsService,
  ],
  exports: [ShopProfileService],
})
export class ShopsModule {}
