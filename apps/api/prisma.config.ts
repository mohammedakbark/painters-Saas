import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// Prisma 7 does not load .env files itself. Load apps/api/.env for local CLI
// use; CI and hosted environments provide DATABASE_URL directly. Variables
// already present in the environment are not overridden.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // Optional here so `prisma generate` works without a database.
  // `prisma migrate` commands fail with a clear error when it is missing.
  datasource: { url: process.env.DATABASE_URL },
});
