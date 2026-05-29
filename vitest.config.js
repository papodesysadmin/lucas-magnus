import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'tests/unit/**/*.test.{js,mjs}',
      'tests/property/**/*.property.test.{js,mjs}',
      'tests/integration/**/*.test.{js,mjs}',
    ],
  },
});
