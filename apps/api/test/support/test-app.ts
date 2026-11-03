import type { ModuleMetadata, Type } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { JWTVerifyGetKey } from 'jose';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { ACCESS_TOKEN_KEYS } from '../../src/auth/access-token-verifier.js';
import { IdentityAdmin } from '../../src/identity/identity-admin.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { FakeIdentityAdmin } from './fake-identity-admin.js';

export interface TestApp {
  app: NestExpressApplication;
  prisma: PrismaService;
  identity: FakeIdentityAdmin;
}

export interface TestAppOptions {
  keys: JWTVerifyGetKey;
  /** Extra test-only controllers, for example to exercise guards. */
  controllers?: Type[];
  imports?: ModuleMetadata['imports'];
}

/**
 * The real AppModule with the same HTTP configuration as production, a local
 * token key set and an in-memory identity provider. Uses the real test DB.
 */
export async function createTestApp(options: TestAppOptions): Promise<TestApp> {
  const identity = new FakeIdentityAdmin();
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule, ...(options.imports ?? [])],
    controllers: options.controllers ?? [],
  })
    .overrideProvider(ACCESS_TOKEN_KEYS)
    .useValue(options.keys)
    .overrideProvider(IdentityAdmin)
    .useValue(identity)
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({
    logger: ['error'],
  });
  configureApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService), identity };
}
