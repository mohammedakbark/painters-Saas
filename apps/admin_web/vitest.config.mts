import { defineConfig } from 'vitest/config';

// Component tests run in jsdom. Browser-level tests for critical admin flows
// (Playwright) will be added with the first such flow.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
