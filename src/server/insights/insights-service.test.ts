import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryInsightsRepository } from "@/test/fakes/in-memory-insights-repository";
import { InsightsService } from "./insights-service";

function eur(salary: number, country = "Germany", jobTitle = "Engineer") {
  return { country, jobTitle, currency: "EUR", salary };
}

describe("InsightsService", () => {
  let repository: InMemoryInsightsRepository;
  let service: InsightsService;

  beforeEach(() => {
    repository = new InMemoryInsightsRepository();
    service = new InsightsService(repository);
  });

  describe("getInsights", () => {
    it("returns the statistics for the chosen currency", async () => {
      repository.add([eur(50_000), eur(60_000), eur(90_000, "France", "Manager")]);

      const result = await service.getInsights("EUR");

      expect(result.currency).toBe("EUR");
      expect(result.overall).toEqual({ headcount: 3, min: 50_000, average: 66_667, median: 60_000, max: 90_000 });
      expect(result.byCountry.map((group) => [group.name, group.headcount])).toEqual([
        ["Germany", 2],
        ["France", 1],
      ]);
      expect(result.byJobTitle.map((group) => group.name)).toEqual(["Engineer", "Manager"]);
    });

    it("rounds average and median to whole currency units, like the salaries themselves", async () => {
      repository.add([eur(50_001), eur(50_002), eur(50_004)]);

      const { overall } = await service.getInsights("EUR");

      // average 50,002.33 and median 50,002
      expect(overall).toMatchObject({ average: 50_002, median: 50_002 });
      expect(Number.isInteger(overall!.average)).toBe(true);
    });

    it("rounds a median that falls between two salaries half up", async () => {
      repository.add([eur(50_001), eur(50_002)]);

      const { overall } = await service.getInsights("EUR");

      expect(overall!.median).toBe(50_002);
    });

    it("rounds inside every group, not only overall", async () => {
      repository.add([eur(50_001, "Spain"), eur(50_002, "Spain")]);

      const { byCountry, byJobTitle } = await service.getInsights("EUR");

      expect(byCountry[0].median).toBe(50_002);
      expect(byJobTitle[0].median).toBe(50_002);
    });

    it("returns no statistics, not zeros, when nobody is paid in the currency", async () => {
      repository.add([eur(50_000)]);

      expect(await service.getInsights("USD")).toEqual({
        currency: "USD",
        overall: null,
        byCountry: [],
        byJobTitle: [],
      });
    });

    it("keeps currencies apart", async () => {
      repository.add([eur(50_000), { country: "United States", jobTitle: "Engineer", currency: "USD", salary: 100_000 }]);

      const usd = await service.getInsights("USD");

      expect(usd.overall).toMatchObject({ headcount: 1, min: 100_000, max: 100_000 });
      expect(usd.byCountry.map((group) => group.name)).toEqual(["United States"]);
    });
  });

  describe("getDistribution", () => {
    it("counts every active employee in exactly one bucket", async () => {
      const salaries = [41_500, 52_000, 58_000, 61_000, 75_000, 75_000, 98_000, 120_000, 143_500, 202_500];
      repository.add(salaries.map((salary) => eur(salary)));

      const { buckets } = await service.getDistribution("EUR");

      expect(buckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(salaries.length);
    });

    it("uses round, contiguous ranges that cover the lowest and highest salary", async () => {
      repository.add([eur(41_500), eur(202_500), eur(100_000)]);

      const { buckets } = await service.getDistribution("EUR");

      expect(buckets[0].from).toBe(40_000);
      expect(buckets.at(-1)!.to).toBe(220_000);
      for (let i = 1; i < buckets.length; i++) {
        expect(buckets[i].from).toBe(buckets[i - 1].to);
      }
    });

    it("puts each salary in the right range", async () => {
      repository.add([eur(41_500), eur(59_999), eur(60_000), eur(202_500)]);

      const { buckets } = await service.getDistribution("EUR");

      const countAt = (from: number) => buckets.find((bucket) => bucket.from === from)!.count;
      expect(countAt(40_000)).toBe(2);
      expect(countAt(60_000)).toBe(1);
      expect(countAt(200_000)).toBe(1);
    });

    it("keeps empty ranges so the chart shows gaps honestly", async () => {
      repository.add([eur(41_500), eur(202_500)]);

      const { buckets } = await service.getDistribution("EUR");

      expect(buckets.length).toBe(9);
      expect(buckets.filter((bucket) => bucket.count === 0).length).toBe(7);
    });

    it("handles everyone earning the same", async () => {
      repository.add([eur(65_000), eur(65_000)]);

      const { buckets } = await service.getDistribution("EUR");

      expect(buckets).toEqual([{ from: 65_000, to: 65_001, count: 2 }]);
    });

    it("only counts the chosen currency", async () => {
      repository.add([eur(50_000), { country: "Japan", jobTitle: "Engineer", currency: "JPY", salary: 8_000_000 }]);

      const { buckets } = await service.getDistribution("EUR");

      expect(buckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(1);
      expect(buckets.at(-1)!.to).toBeLessThan(100_000);
    });

    it("returns no buckets when nobody is paid in the currency", async () => {
      expect(await service.getDistribution("GBP")).toEqual({ currency: "GBP", buckets: [] });
    });
  });

  describe("getCurrencies", () => {
    it("lists currencies that have active employees", async () => {
      repository.add([eur(50_000), eur(60_000), { country: "Japan", jobTitle: "Engineer", currency: "JPY", salary: 8_000_000 }]);

      expect(await service.getCurrencies()).toEqual([
        { currency: "EUR", headcount: 2 },
        { currency: "JPY", headcount: 1 },
      ]);
    });
  });
});
