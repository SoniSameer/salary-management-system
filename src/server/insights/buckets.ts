/** Step sizes that read well on a chart, as multiples of a power of ten. */
const NICE_MULTIPLES = [1, 2, 5, 10] as const;

/**
 * Picks round boundaries for a histogram, for example 40,000, 60,000, 80,000…
 * instead of arbitrary ones such as 41,500 and 55,287.
 *
 * Buckets are half-open: a salary equal to an edge belongs to the bucket that
 * starts there. The last edge is always above `max`, so the highest salary
 * falls inside the final bucket. All edges are whole numbers, because salaries
 * are stored as whole currency units.
 *
 * @param targetBuckets roughly how many buckets to aim for
 * @returns ascending, evenly spaced edges: `edges.length - 1` buckets
 */
export function buildBucketEdges(min: number, max: number, targetBuckets = 10): number[] {
  if (min > max) throw new Error("min must not be greater than max");
  if (targetBuckets < 1) throw new Error("targetBuckets must be at least 1");

  // A step below 1 would make fractional edges, so 1 is the smallest allowed.
  const rawStep = Math.max(1, (max - min) / targetBuckets);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = NICE_MULTIPLES.map((multiple) => multiple * magnitude).find((candidate) => candidate >= rawStep)!;

  const start = Math.floor(min / step) * step;
  const end = (Math.floor(max / step) + 1) * step;

  const edges: number[] = [];
  for (let edge = start; edge <= end; edge += step) edges.push(edge);
  return edges;
}
