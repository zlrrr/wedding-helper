import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Run tests sequentially to avoid database conflicts
    // when multiple test files use the production database
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    // Set environment variables for tests
    env: {
      // Admin credentials for testing ONLY - not for production
      // These values are only used in isolated test environments
      DEFAULT_ADMIN_USERNAME: 'test_admin_user',
      DEFAULT_ADMIN_PASSWORD: 'TestP@ssw0rd!2024#Secure',
      // JWT secret for testing ONLY - random value generated for tests
      JWT_SECRET: 'test-only-jwt-secret-do-not-use-in-production-' + Math.random().toString(36),
    },
  },
});
