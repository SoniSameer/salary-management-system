import "dotenv/config";
import { spawnSync } from "node:child_process";
import { requireTestDatabaseUrl } from "../src/test/integration-db";

// Applies migrations to the TEST database, then runs the integration tests.
const testUrl = requireTestDatabaseUrl();

function run(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): void {
  const result = spawnSync(command, args, { stdio: "inherit", env, shell: true });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

// The Prisma CLI reads DIRECT_URL, so point it at the test database for this
// step only. Vitest must keep the real DIRECT_URL, otherwise the guard in
// requireTestDatabaseUrl() would (correctly) see the test URL as the app URL.
run("npx", ["prisma", "migrate", "deploy"], { ...process.env, DIRECT_URL: testUrl });
run("npx", ["vitest", "run", "--config", "vitest.integration.config.mts"]);
