import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { CatalogueModule } from './catalogue/catalogue.module.js';
import { ShopCatalogueModule } from './shop-catalogue/shop-catalogue.module.js';
import { ShopReviewModule } from './shop-review/shop-review.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { BillsModule } from './bills/bills.module.js';
import { validateEnv } from './config/env.js';
import { HealthModule } from './health/health.module.js';
import { PlatformAdminModule } from './platform-admin/platform-admin.module.js';
import { PlatformShopsModule } from './platform-shops/platform-shops.module.js';
import { CustomerOrdersModule } from './customer-orders/customer-orders.module.js';
import { CustomerSitesModule } from './customer-sites/customer-sites.module.js';
import { DeliveryLocationsModule } from './delivery-locations/delivery-locations.module.js';
import { ShopDiscoveryModule } from './shop-discovery/shop-discovery.module.js';
import { ShopsModule } from './shops/shops.module.js';
import { MediaModule } from './media/media.module.js';
import { StorageModule } from './storage/storage.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // Tests get their configuration only from .env.test / the CI job, never
      // from a developer's .env.
      ignoreEnvFile: process.env.NODE_ENV === 'test',
      validate: validateEnv,
    }),
    AuthModule,
    HealthModule,
    UsersModule,
    ShopDiscoveryModule,
    CustomerSitesModule,
    DeliveryLocationsModule,
    CustomerOrdersModule,
    PlatformAdminModule,
    PlatformShopsModule,
    ShopsModule,
    StorageModule,
    MediaModule,
    CatalogueModule,
    ShopCatalogueModule,
    ShopReviewModule,
    OrdersModule,
    CustomersModule,
    BillsModule,
  ],
})
export class AppModule {}
