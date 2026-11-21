// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * With Cache Components on, Next.js prerenders any GET handler that reads no request
 * data. A handler like that must call connection() BEFORE touching the database,
 * or `next build` opens database connections and fails or stalls when the database
 * is unreachable. These tests pin the order: wait for a request, then query.
 */

const order: string[] = [];

vi.mock("next/server", () => ({
  connection: vi.fn(async () => {
    order.push("connection");
  }),
}));

vi.mock("@/server/container", () => ({
  getEmployeeService: () => ({
    getFilterOptions: async () => {
      order.push("database");
      return { countries: [], departments: [], jobTitles: [], currencies: [] };
    },
  }),
  getInsightsService: () => ({
    getCurrencies: async () => {
      order.push("database");
      return [];
    },
  }),
}));

beforeEach(() => {
  order.length = 0;
});

describe("GET handlers that read no request data", () => {
  it("filter-options waits for a real request before querying", async () => {
    const { GET } = await import("./employees/filter-options/route");

    const response = await GET();

    expect(response.status).toBe(200);
    expect(order).toEqual(["connection", "database"]);
  });

  it("insights currencies waits for a real request before querying", async () => {
    const { GET } = await import("./insights/currencies/route");

    const response = await GET();

    expect(response.status).toBe(200);
    expect(order).toEqual(["connection", "database"]);
  });
});
