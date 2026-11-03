import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import type { Env } from './config/env.js';
import { API_DOCS_PATH, setupApiDocs } from './openapi/openapi.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);

  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const docsEnabled = config.get('NODE_ENV', { infer: true }) !== 'production';
  if (docsEnabled) {
    setupApiDocs(app);
  }

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  const docsNote = docsEnabled ? `; API docs at /${API_DOCS_PATH}` : '';
  Logger.log(`API listening on port ${port}${docsNote}`, 'Bootstrap');
}

await bootstrap();
