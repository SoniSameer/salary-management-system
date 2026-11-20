import "dotenv/config";
import type { PrismaClient } from "@/generated/prisma/client";
import { createPrismaClient } from "@/lib/db";

/**
 * Returns the test database URL, or throws if it is missing or points at the
 * same database as the app. Tests truncate tables, so this guard prevents
 * wiping development or production data by mistake.
 */
type DatabaseEnv = Record<string, string | undefined>;

export function requireTestDatabaseUrl(env: DatabaseEnv = process.env): string {
  const testUrl = env.TEST_DATABASE_URL;
  if (!testUrl) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Point it at a separate Neon branch or a local Postgres.",
    );
  }
  if (testUrl === env.DATABASE_URL || testUrl === env.DIRECT_URL) {
    throw new Error(
      "TEST_DATABASE_URL must differ from DATABASE_URL and DIRECT_URL. Refusing to run tests against the app database.",
    );
  }
  return testUrl;
}

export function createTestPrisma(): PrismaClient {
  return createPrismaClient(requireTestDatabaseUrl());
}

/** Removes all rows so each test starts from a known empty state. */
export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "SalaryRecord", "Employee" RESTART IDENTITY CASCADE',
  );
}
