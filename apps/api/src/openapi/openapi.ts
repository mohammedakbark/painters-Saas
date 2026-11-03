import type { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from '@nestjs/swagger';

/** Swagger UI path. Served only outside production (see main.ts). */
export const API_DOCS_PATH = 'docs';

/**
 * Builds the OpenAPI document from the controllers' decorators and Zod
 * schemas. Call `configureApp` first so the `/v1` prefix is included. This is
 * the source for packages/api_contracts/openapi.json
 * (`pnpm --filter api openapi:export`).
 */
export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Paint Shop Platform API')
    .setDescription(
      'Backend API for the Paint Shop SaaS Platform. Errors use RFC 9457 ' +
        'problem details (application/problem+json).',
    )
    .setVersion('0.0.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Supabase Auth access token.',
    })
    .build();
  return SwaggerModule.createDocument(app, config);
}

export function setupApiDocs(app: INestApplication): void {
  SwaggerModule.setup(API_DOCS_PATH, app, () => createOpenApiDocument(app));
}
