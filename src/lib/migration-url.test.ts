import { describe, expect, it } from "vitest";
import { migrationDatabaseUrl } from "./migration-url";

describe("migrationDatabaseUrl", () => {
  it("uses the direct URL, which is what migrations need", () => {
    expect(migrationDatabaseUrl({ DIRECT_URL: "postgresql://direct/db", DATABASE_URL: "postgresql://pooled/db" })).toBe(
      "postgresql://direct/db",
    );
  });

  it("does not fall back to the pooled URL, which can break migration locks", () => {
    expect(migrationDatabaseUrl({ DATABASE_URL: "postgresql://pooled/db" })).toBe("");
  });

  it("returns an empty string when nothing is set, so build steps that need no database still work", () => {
    expect(migrationDatabaseUrl({})).toBe("");
  });

  it("treats a blank value as not set", () => {
    expect(migrationDatabaseUrl({ DIRECT_URL: "   " })).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(migrationDatabaseUrl({ DIRECT_URL: "  postgresql://direct/db  " })).toBe("postgresql://direct/db");
  });
});
