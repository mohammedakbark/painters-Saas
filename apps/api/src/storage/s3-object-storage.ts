import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  joinPublicUrl,
  ObjectStorage,
  type PutObjectInput,
  StorageUnavailableError,
} from './object-storage.js';

export interface S3ObjectStorageOptions {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  bucket: string;
  publicBaseUrl: string;
}

/**
 * S3-protocol adapter: local Supabase Storage, hosted Supabase Storage,
 * Cloudflare R2 or any S3-compatible service, by configuration only.
 */
export class S3ObjectStorage extends ObjectStorage {
  private readonly client: S3Client;

  constructor(private readonly options: S3ObjectStorageOptions) {
    super();
    this.client = new S3Client({
      endpoint: options.endpoint,
      region: options.region,
      forcePathStyle: options.forcePathStyle,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
      // Supabase Storage and R2 do not support the newer default checksums.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  async put(input: PutObjectInput): Promise<void> {
    await this.send(
      new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        CacheControl: input.cacheControl,
      }),
    );
  }

  async delete(keys: readonly string[]): Promise<void> {
    for (const key of keys) {
      await this.send(
        new DeleteObjectCommand({ Bucket: this.options.bucket, Key: key }),
      );
    }
  }

  publicUrl(key: string): string {
    return joinPublicUrl(this.options.publicBaseUrl, key);
  }

  private async send(
    command: PutObjectCommand | DeleteObjectCommand,
  ): Promise<void> {
    try {
      await this.client.send(command);
    } catch (error) {
      // The SDK error may include the endpoint and key; keep it as the cause only.
      throw new StorageUnavailableError('Object storage request failed.', {
        cause: error,
      });
    }
  }
}
