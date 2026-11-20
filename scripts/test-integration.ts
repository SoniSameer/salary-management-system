import "dotenv/config";
import { spawnSync } from "node:child_process";
import { requireTestDatabaseUrl } from "../src/test/integration-db";

// Applies migrations to the TEST database, then runs the integration tests.
// DIRECT_URL is overridden for the child processes only, so the Prisma CLI
// (which reads DIRECT_URL) targets the test database and never the app one.
const testUrl = requireTestDatabaseUrl();
const env = { ...process.env, DIRECT_URL: testUrl };

function run(command: string, args: string[]): void {
  const result = spawnSync(command, args, { stdio: "inherit", env, shell: true });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("npx", ["prisma", "migrate", "deploy"]);
run("npx", ["vitest", "run", "--config", "vitest.integration.config.mts"]);
