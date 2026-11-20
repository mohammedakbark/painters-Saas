import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CustomerSitesController } from './customer-sites.controller.js';
import { CustomerSitesService } from './customer-sites.service.js';

/** A painter's own work sites in the Customer App (CUS-005). */
@Module({
  imports: [PrismaModule],
  controllers: [CustomerSitesController],
  providers: [CustomerSitesService],
  exports: [CustomerSitesService],
})
export class CustomerSitesModule {}
