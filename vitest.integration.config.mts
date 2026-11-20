import { defineConfig } from "vitest/config";

// Integration tests run against a real PostgreSQL database (TEST_DATABASE_URL).
// Files run one at a time because they share one database.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
