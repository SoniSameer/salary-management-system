import { formatCompactMoney, formatMoney, formatNumber } from "@/lib/format";
import type { DistributionBucket } from "@/server/insights/insights";

export interface DistributionSummary {
  /** Active employees across every bucket. */
  total: number;
  /** The busiest range, or null when there is no data. Ties go to the lower range. */
  peak: { from: number; to: number; count: number; share: number } | null;
  /** One line stating the busiest range, shown beside the chart. */
  sentence: string;
  /** A full description of the chart for screen readers. */
  chartLabel: string;
}

/** For the chart's axis, for example "€40K–€60K". */
export function bucketLabel(bucket: DistributionBucket, currency: string): string {
  return `${formatCompactMoney(bucket.from, currency)}–${formatCompactMoney(bucket.to, currency)}`;
}

/**
 * A range in full, for tooltips and tables. Buckets are half-open, so the upper
 * end is shown as the highest salary that belongs to the range.
 */
export function bucketRange(bucket: DistributionBucket, currency: string): string {
  return rangeText(bucket.from, bucket.to - 1, currency);
}

function rangeText(lowest: number, highest: number, currency: string): string {
  return lowest === highest
    ? formatMoney(lowest, currency)
    : `${formatMoney(lowest, currency)} to ${formatMoney(highest, currency)}`;
}

const plural = (count: number, one: string, many: string) => `${formatNumber(count)} ${count === 1 ? one : many}`;

export function describeDistribution(buckets: DistributionBucket[], currency: string): DistributionSummary {
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);

  if (buckets.length === 0 || total === 0) {
    return {
      total: 0,
      peak: null,
      sentence: `There are no active employees paid in ${currency}.`,
      chartLabel: `Salary distribution in ${currency}: no data.`,
    };
  }

  // The first bucket with the highest count, so ties favour the lower range.
  const busiest = buckets.reduce((best, bucket) => (bucket.count > best.count ? bucket : best), buckets[0]);
  const share = Math.round((busiest.count / total) * 100);
  const peakRange = bucketRange(busiest, currency);
  const span = rangeText(buckets[0].from, buckets[buckets.length - 1].to - 1, currency);

  return {
    total,
    peak: { from: busiest.from, to: busiest.to, count: busiest.count, share },
    sentence: `Most common pay range: ${peakRange}, with ${plural(busiest.count, "employee", "employees")} (${share}% of ${formatNumber(total)}).`,
    chartLabel: `Salary distribution in ${currency}: ${plural(total, "employee", "employees")} in ${plural(buckets.length, "pay range", "pay ranges")} from ${span}. The most common range is ${peakRange} with ${plural(busiest.count, "employee", "employees")}.`,
  };
}
