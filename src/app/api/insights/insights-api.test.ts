// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InsightsService } from "@/server/insights/insights-service";
import { InMemoryInsightsRepository } from "@/test/fakes/in-memory-insights-repository";
import { GET as currencies } from "./currencies/route";
import { GET as distribution } from "./distribution/route";
import { GET as insights } from "./route";

let repository: InMemoryInsightsRepository;

// The handlers get their service from the container. Swap in one that uses the
// in-memory repository so these tests need no database.
vi.mock("@/server/container", () => ({
  getInsightsService: () => new InsightsService(repository),
}));

const request = (path: string) => new Request(`http://localhost/api/insights${path}`);

describe("insights API", () => {
  beforeEach(() => {
    repository = new InMemoryInsightsRepository();
    repository.add([
      { country: "Germany", jobTitle: "Engineer", currency: "EUR", salary: 50_000 },
      { country: "Germany", jobTitle: "Engineer", currency: "EUR", salary: 60_000 },
      { country: "France", jobTitle: "Manager", currency: "EUR", salary: 90_000 },
      { country: "United States", jobTitle: "Engineer", currency: "USD", salary: 100_000 },
      { country: "Japan", jobTitle: "Engineer", currency: "JPY", salary: 8_000_000, active: false },
    ]);
  });

  describe("GET /api/insights", () => {
    it("returns statistics for the chosen currency only", async () => {
      const response = await insights(request("?currency=EUR"));

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        currency: "EUR",
        overall: { headcount: 3, min: 50_000, average: 66_667, median: 60_000, max: 90_000 },
        byCountry: [
          { name: "Germany", headcount: 2 },
          { name: "France", headcount: 1 },
        ],
        byJobTitle: [{ name: "Engineer" }, { name: "Manager" }],
      });
    });

    it("accepts a lower-case currency", async () => {
      const response = await insights(request("?currency=usd"));

      expect(await response.json()).toMatchObject({ currency: "USD", overall: { headcount: 1 } });
    });

    it("returns null statistics, not zeros, for a currency nobody active is paid in", async () => {
      const response = await insights(request("?currency=JPY"));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ currency: "JPY", overall: null, byCountry: [], byJobTitle: [] });
    });

    it("refuses to guess a currency", async () => {
      const response = await insights(request(""));

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: { code: "validation_failed", fields: { currency: ["Choose a currency"] } },
      });
    });

    it("rejects a malformed currency", async () => {
      const response = await insights(request("?currency=euros"));

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/insights/distribution", () => {
    it("returns the histogram for the chosen currency", async () => {
      const response = await distribution(request("/distribution?currency=EUR"));

      expect(response.status).toBe(200);
      const body = (await response.json()) as { currency: string; buckets: { count: number }[] };
      expect(body.currency).toBe("EUR");
      expect(body.buckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(3);
    });

    it("returns no buckets for a currency nobody active is paid in", async () => {
      const response = await distribution(request("/distribution?currency=JPY"));

      expect(await response.json()).toEqual({ currency: "JPY", buckets: [] });
    });

    it("requires a currency", async () => {
      const response = await distribution(request("/distribution"));

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/insights/currencies", () => {
    it("lists currencies with active employees, largest first", async () => {
      const response = await currencies();

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        currencies: [
          { currency: "EUR", headcount: 3 },
          { currency: "USD", headcount: 1 },
        ],
      });
    });
  });
});
