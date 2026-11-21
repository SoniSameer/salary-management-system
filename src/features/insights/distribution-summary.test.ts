import { describe, expect, it } from "vitest";
import { bucketLabel, bucketRange, describeDistribution } from "./distribution-summary";

const BUCKETS = [
  { from: 40_000, to: 60_000, count: 100 },
  { from: 60_000, to: 80_000, count: 400 },
  { from: 80_000, to: 100_000, count: 300 },
  { from: 100_000, to: 120_000, count: 200 },
];

describe("bucketLabel", () => {
  it("shortens the range for an axis", () => {
    expect(bucketLabel({ from: 40_000, to: 60_000, count: 0 }, "EUR")).toBe("€40K–€60K");
  });

  it("uses the employee currency's own symbol", () => {
    expect(bucketLabel({ from: 2_000_000, to: 4_000_000, count: 0 }, "JPY")).toBe("¥2M–¥4M");
  });
});

describe("bucketRange", () => {
  it("states the range in full, with the upper end as the highest salary inside it", () => {
    expect(bucketRange({ from: 40_000, to: 60_000, count: 0 }, "EUR")).toBe("€40,000 to €59,999");
  });
});

describe("describeDistribution", () => {
  it("names the busiest range and its share of employees", () => {
    const summary = describeDistribution(BUCKETS, "EUR");

    expect(summary.total).toBe(1000);
    expect(summary.peak).toEqual({ from: 60_000, to: 80_000, count: 400, share: 40 });
    expect(summary.sentence).toBe("Most common pay range: €60,000 to €79,999, with 400 employees (40% of 1,000).");
  });

  it("describes the whole chart for assistive technology", () => {
    const summary = describeDistribution(BUCKETS, "EUR");

    expect(summary.chartLabel).toBe(
      "Salary distribution in EUR: 1,000 employees in 4 pay ranges from €40,000 to €119,999. The most common range is €60,000 to €79,999 with 400 employees.",
    );
  });

  it("rounds the share to a whole percent", () => {
    const summary = describeDistribution(
      [
        { from: 0, to: 10, count: 1 },
        { from: 10, to: 20, count: 2 },
      ],
      "USD",
    );

    expect(summary.peak?.share).toBe(67);
  });

  it("picks the first range when two are equally common", () => {
    const summary = describeDistribution(
      [
        { from: 0, to: 10, count: 5 },
        { from: 10, to: 20, count: 5 },
      ],
      "USD",
    );

    expect(summary.peak).toMatchObject({ from: 0, to: 10 });
  });

  it("uses singular wording for one employee", () => {
    const summary = describeDistribution([{ from: 65_000, to: 65_001, count: 1 }], "EUR");

    // A range holding a single salary says it once, not "€65,000 to €65,000".
    expect(summary.sentence).toBe("Most common pay range: €65,000, with 1 employee (100% of 1).");
    expect(summary.chartLabel).toContain("1 employee in 1 pay range from €65,000.");
  });

  it("has nothing to say when there are no employees", () => {
    expect(describeDistribution([], "EUR")).toEqual({
      total: 0,
      peak: null,
      sentence: "There are no active employees paid in EUR.",
      chartLabel: "Salary distribution in EUR: no data.",
    });
  });
});
