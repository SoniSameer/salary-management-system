import { describe, expect, it } from "vitest";
import { requireTestDatabaseUrl } from "./integration-db";

describe("requireTestDatabaseUrl", () => {
  it("throws when TEST_DATABASE_URL is missing", () => {
    expect(() => requireTestDatabaseUrl({})).toThrow(/TEST_DATABASE_URL is not set/);
  });

  it("refuses to use the application database", () => {
    const url = "postgresql://u:p@host/app";
    expect(() =>
      requireTestDatabaseUrl({ TEST_DATABASE_URL: url, DATABASE_URL: url }),
    ).toThrow(/must differ/);
    expect(() =>
      requireTestDatabaseUrl({ TEST_DATABASE_URL: url, DIRECT_URL: url }),
    ).toThrow(/must differ/);
  });

  it("returns the URL when it is separate from the app database", () => {
    const url = requireTestDatabaseUrl({
      TEST_DATABASE_URL: "postgresql://u:p@host/test",
      DATABASE_URL: "postgresql://u:p@host/app",
    });
    expect(url).toBe("postgresql://u:p@host/test");
  });
});
