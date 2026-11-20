import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Unit tests: fast, no database. Integration tests live in *.integration.test.ts
// and run through vitest.integration.config.mts.
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["src/**/*.integration.test.ts", "node_modules/**"],
  },
});
