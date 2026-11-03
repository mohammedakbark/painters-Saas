import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { createOpenApiDocument } from '../openapi/openapi.js';

/**
 * Writes the OpenAPI document to the given path without starting the HTTP
 * server or connecting to the database. Requires the same environment
 * variables as the API (validated by ConfigModule).
 */
async function exportOpenApi(): Promise<void> {
  const target = process.argv[2];
  if (!target) {
    throw new Error('Usage: node dist/scripts/export-openapi.js <output-file>');
  }
  const outputPath = resolve(target);

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const document = createOpenApiDocument(app);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(
      outputPath,
      `${JSON.stringify(document, null, 2)}\n`,
      'utf8',
    );
    console.log(`OpenAPI document written to ${outputPath}`);
  } finally {
    await app.close();
  }
}

await exportOpenApi();
