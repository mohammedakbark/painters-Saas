import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { validateEnv } from './config/env.js';
import { HealthModule } from './health/health.module.js';
import { PlatformAdminModule } from './platform-admin/platform-admin.module.js';
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
    PlatformAdminModule,
  ],
})
export class AppModule {}
