import { describe, expect, it } from "vitest";
import { buildBucketEdges } from "./buckets";

describe("buildBucketEdges", () => {
  it("uses round boundaries that cover the whole range", () => {
    expect(buildBucketEdges(41_500, 202_500)).toEqual([
      40_000, 60_000, 80_000, 100_000, 120_000, 140_000, 160_000, 180_000, 200_000, 220_000,
    ]);
  });

  it("scales to large currencies such as yen", () => {
    expect(buildBucketEdges(3_580_000, 17_300_000)).toEqual([
      2_000_000, 4_000_000, 6_000_000, 8_000_000, 10_000_000, 12_000_000, 14_000_000, 16_000_000, 18_000_000,
    ]);
  });

  it("works for a tiny range", () => {
    expect(buildBucketEdges(5, 7)).toEqual([5, 6, 7, 8]);
  });

  it("gives one bucket when everyone earns the same", () => {
    expect(buildBucketEdges(65_000, 65_000)).toEqual([65_000, 65_001]);
  });

  it("puts a value equal to the highest salary inside the last bucket, not on its edge", () => {
    const edges = buildBucketEdges(40_000, 80_000);

    expect(edges.at(-1)!).toBeGreaterThan(80_000);
  });

  it("respects a different target number of buckets", () => {
    const few = buildBucketEdges(0, 100_000, 4);
    const many = buildBucketEdges(0, 100_000, 20);

    expect(few.length).toBeLessThan(many.length);
  });

  it.each([
    [41_500, 202_500],
    [3_580_000, 17_300_000],
    [1, 2],
    [100, 100],
    [0, 999_999],
    [48_000, 48_001],
    [12_345, 987_654],
    [250_000, 260_000],
  ])("always covers %s to %s with ascending, evenly spaced whole-number edges", (min, max) => {
    const edges = buildBucketEdges(min, max);

    expect(edges[0]).toBeLessThanOrEqual(min);
    expect(edges.at(-1)!).toBeGreaterThan(max);
    const step = edges[1] - edges[0];
    expect(step).toBeGreaterThan(0);
    for (let i = 1; i < edges.length; i++) {
      expect(Number.isInteger(edges[i])).toBe(true);
      expect(edges[i] - edges[i - 1]).toBe(step);
    }
  });

  it.each([
    [41_500, 202_500],
    [0, 999_999],
    [12_345, 987_654],
  ])("keeps the number of buckets reasonable for %s to %s", (min, max) => {
    const buckets = buildBucketEdges(min, max).length - 1;

    expect(buckets).toBeGreaterThanOrEqual(4);
    expect(buckets).toBeLessThanOrEqual(12);
  });

  it("rejects an inverted range", () => {
    expect(() => buildBucketEdges(10, 5)).toThrow(/min.*max/i);
  });

  it("rejects a target below one", () => {
    expect(() => buildBucketEdges(1, 10, 0)).toThrow(/at least 1/i);
  });
});
