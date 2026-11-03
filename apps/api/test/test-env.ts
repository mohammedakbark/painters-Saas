import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

// E2E tests run against a real Postgres test database. Locally its settings
// live in apps/api/.env.test; in CI they come from the job environment.
const TEST_ENV_FILE = '.env.test';

/** Variables from apps/api/.env.test (empty when the file does not exist). */
export function loadTestEnvFile(): Record<string, string> {
  if (!existsSync(TEST_ENV_FILE)) {
    return {};
  }
  const parsed = parseEnv(readFileSync(TEST_ENV_FILE, 'utf8'));
  return Object.fromEntries(
    Object.entries(parsed).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}

/**
 * The test database URL. Refuses anything whose database name does not
 * contain "test": the suites truncate tables, so they must never point at
 * development or production data.
 */
export function requireTestDatabaseUrl(url: string | undefined): string {
  if (!url) {
    throw new Error(
      'E2E tests need DATABASE_URL for the test database. Copy apps/api/.env.test.example ' +
        'to apps/api/.env.test (local) or set DATABASE_URL in the CI job.',
    );
  }
  const databaseName = new URL(url).pathname.replace(/^\//, '');
  if (!databaseName.includes('test')) {
    throw new Error(
      `Refusing to run e2e tests against database "${databaseName}": its name must contain "test".`,
    );
  }
  return url;
}
