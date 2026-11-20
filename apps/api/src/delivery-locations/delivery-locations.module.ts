import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { DeliveryLocationsController } from './delivery-locations.controller.js';
import { DeliveryLocationsService } from './delivery-locations.service.js';

/** Saved delivery places in the Customer App (CUS-006, D-061). */
@Module({
  imports: [PrismaModule],
  controllers: [DeliveryLocationsController],
  providers: [DeliveryLocationsService],
  exports: [DeliveryLocationsService],
})
export class DeliveryLocationsModule {}
