import { Module } from '@nestjs/common';
import { IdentityAdmin } from './identity-admin.js';
import { SupabaseIdentityAdmin } from './supabase-identity-admin.js';

@Module({
  providers: [{ provide: IdentityAdmin, useClass: SupabaseIdentityAdmin }],
  exports: [IdentityAdmin],
})
export class IdentityModule {}
