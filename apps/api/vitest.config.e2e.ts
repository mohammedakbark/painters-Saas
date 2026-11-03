import { defineConfig } from 'vitest/config';
import { loadTestEnvFile } from './test/test-env.js';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    env: loadTestEnvFile(),
    globalSetup: ['./test/global-setup-e2e.ts'],
    setupFiles: ['./test/setup-e2e.ts'],
    // Database-backed suites share one database; run them one file at a time.
    fileParallelism: false,
  },
});
