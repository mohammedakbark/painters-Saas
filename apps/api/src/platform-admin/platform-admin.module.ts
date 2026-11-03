import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PlatformAdminProvisioning } from './platform-admin-provisioning.js';

@Module({
  imports: [PrismaModule, IdentityModule],
  providers: [PlatformAdminProvisioning],
  exports: [PlatformAdminProvisioning],
})
export class PlatformAdminModule {}
