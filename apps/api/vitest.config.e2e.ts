import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { defineConfig } from 'vitest/config';

// E2E tests run against a real Postgres test database. Locally its connection
// settings live in apps/api/.env.test; in CI they come from the job environment.
const TEST_ENV_FILE = '.env.test';
const testEnv = existsSync(TEST_ENV_FILE)
  ? parseEnv(readFileSync(TEST_ENV_FILE, 'utf8'))
  : {};

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    env: testEnv,
    setupFiles: ['./test/setup-e2e.ts'],
    // Database-backed suites share one database; run them one file at a time.
    fileParallelism: false,
  },
});
