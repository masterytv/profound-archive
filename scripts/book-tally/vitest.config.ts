import { defineConfig } from 'vitest/config';
import path from 'path';

// Separate from the repo-level vitest.config.ts (which only includes tests/**).
// Run with: npm run test:book-tally
export default defineConfig({
  root: __dirname,
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: { alias: { '@': path.resolve(__dirname, '..', '..', 'src') } },
});
