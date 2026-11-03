import { spawnSync } from 'node:child_process';
import { loadTestEnvFile, requireTestDatabaseUrl } from './test-env.js';

/**
 * Runs once before the e2e suites: applies Prisma migrations to the test
 * database (the same one the tests use), so tests always run on the current
 * schema.
 */
export default function setup(): void {
  const databaseUrl = requireTestDatabaseUrl(
    loadTestEnvFile().DATABASE_URL ?? process.env.DATABASE_URL,
  );
  const result = spawnSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: ['ignore', 'ignore', 'inherit'],
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    throw new Error('prisma migrate deploy failed for the test database.');
  }
}
