import type { ModuleMetadata, Type } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { JWTVerifyGetKey } from 'jose';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { ACCESS_TOKEN_KEYS } from '../../src/auth/access-token-verifier.js';
import { IdentityAdmin } from '../../src/identity/identity-admin.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { ObjectStorage } from '../../src/storage/object-storage.js';
import { FakeIdentityAdmin } from './fake-identity-admin.js';
import { FakeObjectStorage } from './fake-object-storage.js';

export interface TestApp {
  app: NestExpressApplication;
  prisma: PrismaService;
  identity: FakeIdentityAdmin;
  storage: FakeObjectStorage;
}

export interface TestAppOptions {
  keys: JWTVerifyGetKey;
  /** Extra test-only controllers, for example to exercise guards. */
  controllers?: Type[];
  imports?: ModuleMetadata['imports'];
}

/**
 * The real AppModule with the same HTTP configuration as production, a local
 * token key set, an in-memory identity provider and in-memory object storage.
 * Uses the real test DB.
 */
export async function createTestApp(options: TestAppOptions): Promise<TestApp> {
  const identity = new FakeIdentityAdmin();
  const storage = new FakeObjectStorage();
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule, ...(options.imports ?? [])],
    controllers: options.controllers ?? [],
  })
    .overrideProvider(ACCESS_TOKEN_KEYS)
    .useValue(options.keys)
    .overrideProvider(IdentityAdmin)
    .useValue(identity)
    .overrideProvider(ObjectStorage)
    .useValue(storage)
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({
    logger: ['error'],
  });
  configureApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService), identity, storage };
}
