import {
  joinPublicUrl,
  ObjectStorage,
  type PutObjectInput,
  StorageUnavailableError,
} from '../../src/storage/object-storage.js';

/** In-memory object storage for e2e tests. */
export class FakeObjectStorage extends ObjectStorage {
  readonly objects = new Map<string, PutObjectInput>();
  /** When true, every call fails like an unreachable provider. */
  failing = false;

  async put(input: PutObjectInput): Promise<void> {
    this.check();
    this.objects.set(input.key, input);
  }

  async delete(keys: readonly string[]): Promise<void> {
    this.check();
    for (const key of keys) {
      this.objects.delete(key);
    }
  }

  publicUrl(key: string): string {
    return joinPublicUrl('https://media.test.invalid/shop-media', key);
  }

  reset(): void {
    this.objects.clear();
    this.failing = false;
  }

  private check(): void {
    if (this.failing) {
      throw new StorageUnavailableError('Object storage request failed.');
    }
  }
}
