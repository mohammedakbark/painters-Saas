import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { createRemoteJWKSet } from 'jose';
import type { Env } from '../config/env.js';
import { UsersModule } from '../users/users.module.js';
import {
  ACCESS_TOKEN_KEYS,
  AccessTokenVerifier,
} from './access-token-verifier.js';
import { AuthGuard } from './auth.guard.js';

@Module({
  imports: [UsersModule],
  providers: [
    {
      provide: ACCESS_TOKEN_KEYS,
      inject: [ConfigService],
      // Lazy: keys are fetched on the first verification, then cached, so the
      // app can start (and export OpenAPI) without reaching the provider.
      useFactory: (config: ConfigService<Env, true>) =>
        createRemoteJWKSet(
          new URL(config.get('AUTH_JWKS_URL', { infer: true })),
          {
            timeoutDuration: 5_000,
            cooldownDuration: 30_000,
            cacheMaxAge: 10 * 60_000,
          },
        ),
    },
    AccessTokenVerifier,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}
