import { Global, Module } from '@nestjs/common';
import { ImageStore } from './image-store.js';

/** Public image handling shared by shop photos and catalogue images (ADR 0007). */
@Global()
@Module({
  providers: [ImageStore],
  exports: [ImageStore],
})
export class MediaModule {}
