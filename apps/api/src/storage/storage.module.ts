import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { ObjectStorage } from './object-storage.js';
import { S3ObjectStorage } from './s3-object-storage.js';

/** Provides the `ObjectStorage` port; tests override it with an in-memory fake. */
@Global()
@Module({
  providers: [
    {
      provide: ObjectStorage,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        new S3ObjectStorage({
          endpoint: config.get('STORAGE_S3_ENDPOINT', { infer: true }),
          region: config.get('STORAGE_S3_REGION', { infer: true }),
          accessKeyId: config.get('STORAGE_S3_ACCESS_KEY_ID', { infer: true }),
          secretAccessKey: config.get('STORAGE_S3_SECRET_ACCESS_KEY', {
            infer: true,
          }),
          forcePathStyle: config.get('STORAGE_S3_FORCE_PATH_STYLE', {
            infer: true,
          }),
          bucket: config.get('STORAGE_BUCKET', { infer: true }),
          publicBaseUrl: config.get('STORAGE_PUBLIC_BASE_URL', { infer: true }),
        }),
    },
  ],
  exports: [ObjectStorage],
})
export class StorageModule {}
