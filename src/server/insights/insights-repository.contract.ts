import { describe, expect, it } from "vitest";
import type { InsightsRepository } from "./insights-repository";

export interface SeedEmployee {
  country: string;
  jobTitle: string;
  currency: string;
  salary: number;
  /** Defaults to true. */
  active?: boolean;
}

export interface InsightsFixture {
  repository: InsightsRepository;
  /** Adds employees to an otherwise empty store. */
  seed: (employees: SeedEmployee[]) => Promise<void>;
}

/**
 * A small dataset where every figure can be checked by hand.
 *
 * EUR (active):   Germany 50,000 / 60,000 / 90,000    France 40,000 / 80,000
 * EUR (inactive): Germany 1,000,000   <- must never be counted
 * USD (active):   United States 100,000 / 120,000
 * JPY (inactive only): Japan 8,000,000
 */
const DATASET: SeedEmployee[] = [
  { country: "Germany", jobTitle: "Engineer", currency: "EUR", salary: 50_000 },
  { country: "Germany", jobTitle: "Engineer", currency: "EUR", salary: 60_000 },
  { country: "Germany", jobTitle: "Manager", currency: "EUR", salary: 90_000 },
  { country: "France", jobTitle: "Engineer", currency: "EUR", salary: 40_000 },
  { country: "France", jobTitle: "Analyst", currency: "EUR", salary: 80_000 },
  { country: "Germany", jobTitle: "Engineer", currency: "EUR", salary: 1_000_000, active: false },
  { country: "United States", jobTitle: "Engineer", currency: "USD", salary: 100_000 },
  { country: "United States", jobTitle: "Engineer", currency: "USD", salary: 120_000 },
  { country: "Japan", jobTitle: "Engineer", currency: "JPY", salary: 8_000_000, active: false },
];

/**
 * Behavior every InsightsRepository must have. The in-memory fake runs this in
 * unit tests and the Prisma repository runs it against PostgreSQL, so the SQL
 * (medians, grouping, ordering) is checked against known answers.
 *
 * `createFixture` must return a fixture over an EMPTY store.
 */
export function describeInsightsRepositoryContract(name: string, createFixture: () => Promise<InsightsFixture>): void {
  describe(`${name} satisfies the InsightsRepository contract`, () => {
    async function seeded(extra: SeedEmployee[] = []) {
      const fixture = await createFixture();
      await fixture.seed([...DATASET, ...extra]);
      return fixture.repository;
    }

    describe("getStats", () => {
      it("summarises everyone paid in the currency", async () => {
        const repo = await seeded();

        const { overall } = await repo.getStats("EUR");

        expect(overall).toMatchObject({ headcount: 5, min: 40_000, max: 90_000 });
        expect(overall!.average).toBeCloseTo(64_000);
        expect(overall!.median).toBeCloseTo(60_000);
      });

      it("groups by country, largest group first", async () => {
        const repo = await seeded();

        const { byCountry } = await repo.getStats("EUR");

        expect(byCountry.map((group) => group.name)).toEqual(["Germany", "France"]);
        expect(byCountry[0]).toMatchObject({ headcount: 3, min: 50_000, max: 90_000 });
        expect(byCountry[0].average).toBeCloseTo(66_666.67, 1);
        expect(byCountry[0].median).toBeCloseTo(60_000);
        expect(byCountry[1]).toMatchObject({ headcount: 2, min: 40_000, max: 80_000 });
        expect(byCountry[1].average).toBeCloseTo(60_000);
        expect(byCountry[1].median).toBeCloseTo(60_000);
      });

      it("groups by job title, breaking ties by name", async () => {
        const repo = await seeded();

        const { byJobTitle } = await repo.getStats("EUR");

        expect(byJobTitle.map((group) => group.name)).toEqual(["Engineer", "Analyst", "Manager"]);
        expect(byJobTitle[0]).toMatchObject({ headcount: 3, min: 40_000, max: 60_000 });
        expect(byJobTitle[0].average).toBeCloseTo(50_000);
        expect(byJobTitle[0].median).toBeCloseTo(50_000);
      });

      it("takes the middle value for an odd count and the mean of the two middle values for an even count", async () => {
        const repo = await seeded([
          { country: "Spain", jobTitle: "Designer", currency: "EUR", salary: 50_001 },
          { country: "Spain", jobTitle: "Designer", currency: "EUR", salary: 50_002 },
        ]);

        const { byCountry } = await repo.getStats("EUR");

        const spain = byCountry.find((group) => group.name === "Spain")!;
        expect(spain.median).toBeCloseTo(50_001.5);
        // The odd-sized Germany group still uses its middle value.
        expect(byCountry.find((group) => group.name === "Germany")!.median).toBeCloseTo(60_000);
      });

      it("reports a group of one person with equal figures", async () => {
        const repo = await seeded();

        const { byJobTitle } = await repo.getStats("EUR");

        const manager = byJobTitle.find((group) => group.name === "Manager")!;
        expect(manager).toMatchObject({ headcount: 1, min: 90_000, max: 90_000 });
        expect(manager.average).toBeCloseTo(90_000);
        expect(manager.median).toBeCloseTo(90_000);
      });

      it("never counts deactivated employees", async () => {
        const repo = await seeded([
          { country: "Narnia", jobTitle: "Faun", currency: "EUR", salary: 70_000, active: false },
        ]);

        const { overall, byCountry } = await repo.getStats("EUR");

        expect(overall!.max).toBe(90_000);
        expect(overall!.headcount).toBe(5);
        expect(byCountry.map((group) => group.name)).not.toContain("Narnia");
      });

      it("never mixes in another currency", async () => {
        const repo = await seeded();

        const { overall, byCountry } = await repo.getStats("USD");

        expect(overall).toMatchObject({ headcount: 2, min: 100_000, max: 120_000 });
        expect(overall!.average).toBeCloseTo(110_000);
        expect(byCountry.map((group) => group.name)).toEqual(["United States"]);
      });

      it("returns no statistics, not zeros, for a currency nobody active is paid in", async () => {
        const repo = await seeded();

        for (const currency of ["GBP", "JPY"]) {
          expect(await repo.getStats(currency)).toEqual({ overall: null, byCountry: [], byJobTitle: [] });
        }
      });
    });

    describe("getCurrencies", () => {
      it("lists currencies with active employees, largest first", async () => {
        const repo = await seeded();

        expect(await repo.getCurrencies()).toEqual([
          { currency: "EUR", headcount: 5 },
          { currency: "USD", headcount: 2 },
        ]);
      });

      it("is empty when there are no employees", async () => {
        const fixture = await createFixture();

        expect(await fixture.repository.getCurrencies()).toEqual([]);
      });
    });

    describe("getSalaryRange", () => {
      it("returns the lowest and highest current salary of active employees", async () => {
        const repo = await seeded();

        expect(await repo.getSalaryRange("EUR")).toEqual({ min: 40_000, max: 90_000 });
      });

      it("returns null when nobody active is paid in the currency", async () => {
        const repo = await seeded();

        expect(await repo.getSalaryRange("JPY")).toBeNull();
        expect(await repo.getSalaryRange("GBP")).toBeNull();
      });
    });

    describe("countByEdges", () => {
      it("counts salaries in each half-open range, so a salary on an edge goes up", async () => {
        const repo = await seeded();

        // 40,000 | 50,000 and 60,000 | 80,000 and 90,000. The 50,000 salary sits on an edge.
        expect(await repo.countByEdges("EUR", [0, 50_000, 70_000, 100_000])).toEqual([1, 2, 2]);
      });

      it("does not count salaries outside every range", async () => {
        const repo = await seeded();

        expect(await repo.countByEdges("EUR", [45_000, 70_000])).toEqual([2]);
      });

      it("counts only active employees in the chosen currency", async () => {
        const repo = await seeded();

        expect(await repo.countByEdges("EUR", [0, 2_000_000])).toEqual([5]);
        expect(await repo.countByEdges("USD", [0, 2_000_000])).toEqual([2]);
      });

      it("returns zeros for a currency with nobody in it", async () => {
        const repo = await seeded();

        expect(await repo.countByEdges("GBP", [0, 100, 200])).toEqual([0, 0]);
      });

      it("returns a zero for a range nobody falls in", async () => {
        const repo = await seeded();

        expect(await repo.countByEdges("EUR", [0, 10_000, 50_000])).toEqual([0, 1]);
      });
    });
  });
}
