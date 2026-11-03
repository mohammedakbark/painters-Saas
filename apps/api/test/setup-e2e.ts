import { requireTestDatabaseUrl } from './test-env.js';

// Runs in each e2e worker before AppModule (and its .env loading) is imported.
// E2E tests must target the dedicated test database, never local development
// data: DATABASE_URL has to come from apps/api/.env.test or the CI job.
requireTestDatabaseUrl(process.env.DATABASE_URL);
