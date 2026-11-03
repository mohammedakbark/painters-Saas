// Runs before every e2e test file, before AppModule (and its .env loading) is imported.
// E2E tests must target the dedicated test database, never local development data:
// DATABASE_URL has to come from apps/api/.env.test (locally) or the CI job environment.
if (!process.env.DATABASE_URL) {
  throw new Error(
    'E2E tests need DATABASE_URL for the test database. Copy apps/api/.env.test.example ' +
      'to apps/api/.env.test (local) or set DATABASE_URL in the CI job.',
  );
}
